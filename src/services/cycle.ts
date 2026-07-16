import { prisma } from "@/lib/db";
import { triggerDisbursement } from "./monify";

/**
 * Confirms a contribution payment, checks if the cycle is completed,
 * executes disbursement, and advances the cycle rotation.
 * 
 * This function is idempotent and signature-safe.
 */
export async function confirmContributionPayment(params: {
  circleId: string;
  memberId: string;
  cycleNumber: number;
  transactionRef: string;
}) {
  const { circleId, memberId, cycleNumber, transactionRef } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch contribution
    const contribution = await tx.contribution.findUnique({
      where: {
        circleId_memberId_cycleNumber: {
          circleId,
          memberId,
          cycleNumber,
        }
      }
    });

    if (!contribution) {
      // Check if circle has not started yet (members count < expected member count)
      const circle = await tx.circle.findUnique({
        where: { id: circleId },
        include: { members: true }
      });
      
      if (circle && circle.members.length < circle.memberCount) {
        return {
          success: false,
          error: `Circle is waiting for more members to join (${circle.members.length}/${circle.memberCount}). Cycle 1 has not started yet.`,
          alreadyProcessed: false,
        };
      }

      throw new Error(`Contribution not found for member ${memberId} in cycle ${cycleNumber}`);
    }

    // Idempotency: if already paid, do nothing and return
    if (contribution.status === "PAID") {
      return { success: true, alreadyProcessed: true };
    }

    // 2. Mark the contribution as PAID
    await tx.contribution.update({
      where: { id: contribution.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        monnifyTransactionRef: transactionRef,
      }
    });

    // 3. Fetch circle and all its members
    const circle = await tx.circle.findUnique({
      where: { id: circleId },
      include: {
        members: {
          include: {
            user: true,
          }
        }
      }
    });

    if (!circle) {
      throw new Error(`Circle ${circleId} not found`);
    }

    // 4. Check if all contributions for the current cycle are now PAID
    const totalContributions = await tx.contribution.findMany({
      where: {
        circleId,
        cycleNumber,
      }
    });

    const unpaidCount = totalContributions.filter((c) => c.status !== "PAID").length;

    // If there are still unpaid contributions, the cycle is not yet complete
    if (unpaidCount > 0) {
      return {
        success: true,
        alreadyProcessed: false,
        cycleCompleted: false,
        unpaidCount,
      };
    }

    // --- Cycle is fully funded! Trigger Payout ---
    const payoutOrder = Array.isArray(circle.payoutOrder)
      ? (circle.payoutOrder as string[])
      : [];

    const currentRecipientMemberId = circle.currentRecipientId;
    if (!currentRecipientMemberId) {
      throw new Error("Cycle is fully funded but no current recipient is assigned.");
    }

    const recipientMember = circle.members.find((m) => m.id === currentRecipientMemberId);
    if (!recipientMember) {
      throw new Error(`Recipient member ${currentRecipientMemberId} not found in circle.`);
    }

    // Calculate total pot amount (contribution * number of members)
    const potAmount = circle.contributionAmount * circle.memberCount;

    // Create a Payout record
    const payout = await tx.payout.create({
      data: {
        circleId,
        cycleNumber,
        recipientMemberId: currentRecipientMemberId,
        amount: potAmount,
        status: "PENDING",
      }
    });

    // Determine destination bank details
    const destAccountNumber = recipientMember.user.payoutBankAccountNumber;
    const destBankCode = recipientMember.user.payoutBankCode;
    const destAccountName = recipientMember.user.name;

    let disbursementResult = { success: false, transactionReference: null, status: "FAILED", error: "" };

    if (!destAccountNumber || !destBankCode) {
      console.warn(`Payout recipient ${recipientMember.user.name} has no payout bank account set. Marking payout as FAILED (requires manual intervention).`);
      disbursementResult.error = "No payout bank details configured on user profile.";
    } else {
      // Trigger Monnify single single-disbursement API
      const response = await triggerDisbursement({
        payoutId: payout.id,
        circleName: circle.name,
        cycleNumber,
        amount: potAmount,
        destinationBankCode: destBankCode,
        destinationAccountNumber: destAccountNumber,
        destinationAccountName: destAccountName,
      });

      if (response.success) {
        disbursementResult = {
          success: true,
          transactionReference: response.transactionReference as any,
          status: response.status || "SUCCESS",
          error: "",
        };
      } else {
        disbursementResult.error = response.error || "Disbursement API request failed";
      }
    }

    // Update payout status based on disbursement API result
    await tx.payout.update({
      where: { id: payout.id },
      data: {
        status: disbursementResult.success ? "PAID" : "FAILED",
        paidAt: disbursementResult.success ? new Date() : null,
        monnifyDisbursementRef: disbursementResult.transactionReference,
      }
    });

    // 5. Advance Cycle Rotation
    const currentRecipientIndex = payoutOrder.indexOf(currentRecipientMemberId);
    const nextRecipientIndex = currentRecipientIndex + 1;
    const hasNextCycle = nextRecipientIndex < payoutOrder.length;

    if (hasNextCycle) {
      const nextRecipientId = payoutOrder[nextRecipientIndex];
      const nextCycleNumber = cycleNumber + 1;

      // Update Circle to next cycle
      await tx.circle.update({
        where: { id: circleId },
        data: {
          currentCycleNumber: nextCycleNumber,
          currentRecipientId: nextRecipientId,
        }
      });

      // Create new set of pending Contributions for the next cycle
      const nextContributions = circle.members.map((m) => {
        return tx.contribution.create({
          data: {
            circleId,
            memberId: m.id,
            cycleNumber: nextCycleNumber,
            amount: circle.contributionAmount,
            status: "PENDING",
          }
        });
      });

      await Promise.all(nextContributions);

      return {
        success: true,
        alreadyProcessed: false,
        cycleCompleted: true,
        circleCompleted: false,
        nextCycleNumber,
        nextRecipientId,
        disbursementError: disbursementResult.error || null,
      };
    } else {
      // No more cycles: the circle is completed!
      await tx.circle.update({
        where: { id: circleId },
        data: {
          status: "COMPLETED",
          currentRecipientId: null,
        }
      });

      return {
        success: true,
        alreadyProcessed: false,
        cycleCompleted: true,
        circleCompleted: true,
        disbursementError: disbursementResult.error || null,
      };
    }
  });
}
