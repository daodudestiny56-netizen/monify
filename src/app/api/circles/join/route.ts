import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createReservedAccount } from "@/services/monify";

// Helper to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: "Invite code is required." },
        { status: 400 }
      );
    }

    const normalizedCode = inviteCode.trim().toUpperCase();

    // Find the circle
    const circle = await prisma.circle.findUnique({
      where: { inviteCode: normalizedCode },
      include: {
        members: {
          include: {
            user: {
              select: { name: true, phone: true }
            }
          }
        }
      }
    });

    if (!circle) {
      return NextResponse.json(
        { error: "Circle not found with the provided invite code." },
        { status: 404 }
      );
    }

    if (circle.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This circle is no longer active." },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const isAlreadyMember = circle.members.some((m) => m.userId === user.id);
    if (isAlreadyMember) {
      return NextResponse.json(
        { error: "You are already a member of this circle." },
        { status: 400 }
      );
    }

    // Check if the circle is full
    if (circle.members.length >= circle.memberCount) {
      return NextResponse.json(
        { error: "This circle is already full." },
        { status: 400 }
      );
    }

    const currentMemberIndex = circle.members.length;
    const isNowFull = currentMemberIndex + 1 === circle.memberCount;

    // Run join operations in a transaction
    const joinResult = await prisma.$transaction(async (tx) => {
      // 1. Create the new member record
      const newMember = await tx.circleMember.create({
        data: {
          circleId: circle.id,
          userId: user.id,
          payoutPosition: currentMemberIndex,
        }
      });

      const allMembers = [...circle.members, newMember];
      let finalPayoutOrder: string[] = [];

      if (isNowFull) {
        // Circle is now full! Establish the final payout order rotation
        const memberIds = allMembers.map((m) => m.id);
        
        if (circle.payoutOrderType === "RANDOM") {
          finalPayoutOrder = shuffleArray(memberIds);
          
          // Re-update payout positions in the database to reflect the shuffled rotation
          for (let i = 0; i < finalPayoutOrder.length; i++) {
            const memberId = finalPayoutOrder[i];
            await tx.circleMember.update({
              where: { id: memberId },
              data: { payoutPosition: i },
            });
          }
        } else {
          // Keep join order
          finalPayoutOrder = memberIds;
        }

        // Determine first recipient
        const firstRecipientId = finalPayoutOrder[0];

        // Update Circle properties to active cycle 1
        await tx.circle.update({
          where: { id: circle.id },
          data: {
            payoutOrder: finalPayoutOrder,
            currentRecipientId: firstRecipientId,
            currentCycleNumber: 1,
          }
        });

        // Initialize contributions for all members for Cycle 1
        const contributionPromises = allMembers.map((member) => {
          return tx.contribution.create({
            data: {
              circleId: circle.id,
              memberId: member.id,
              cycleNumber: 1,
              amount: circle.contributionAmount,
              status: "PENDING",
            }
          });
        });

        await Promise.all(contributionPromises);
      } else {
        // Just append the new member to the end of the existing partial payout order
        const currentPayoutOrder = Array.isArray(circle.payoutOrder) 
          ? (circle.payoutOrder as string[]) 
          : [];
        
        await tx.circle.update({
          where: { id: circle.id },
          data: {
            payoutOrder: [...currentPayoutOrder, newMember.id],
          }
        });
      }

      return newMember;
    });

    // 2. Provision Monnify reserved account outside the transaction to avoid lock contention
    const reservedAccountResult = await createReservedAccount({
      memberId: joinResult.id,
      memberName: user.name,
      memberEmail: user.email,
      circleId: circle.id,
      circleName: circle.name,
    });

    let updatedMember = joinResult;
    if (reservedAccountResult.success) {
      updatedMember = await prisma.circleMember.update({
        where: { id: joinResult.id },
        data: {
          monnifyReservedAccountNumber: reservedAccountResult.accountNumber,
          monnifyBankName: reservedAccountResult.bankName,
          monnifyBankCode: reservedAccountResult.bankCode,
        }
      });
    }

    return NextResponse.json({
      message: isNowFull 
        ? "Joined successfully. The circle is now full and Cycle 1 has officially started!" 
        : "Joined successfully. Waiting for other members to join.",
      circleId: circle.id,
      member: updatedMember,
      isCycleStarted: isNowFull,
    });
  } catch (error: any) {
    console.error("Join circle error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join circle." },
      { status: 500 }
    );
  }
}
