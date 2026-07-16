import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePin } from "@/lib/auth";
import { createReservedAccount } from "@/services/monify";

// Helper to normalize Nigerian phone numbers to match database (e.g. +234803... or 803... to 0803...)
function normalizePhone(phone: string): string {
  let cleaned = phone.trim().replace(/\D/g, "");
  // If starts with 234, replace with 0
  if (cleaned.startsWith("234") && cleaned.length > 10) {
    return "0" + cleaned.slice(3);
  }
  // If doesn't start with 0 and is 10 digits (e.g. 8031234567), prepand 0
  if (!cleaned.startsWith("0") && cleaned.length === 10) {
    return "0" + cleaned;
  }
  return cleaned;
}

// Helper to shuffle an array (for USSD circle fill auto-start)
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
    // Africa's Talking POSTs as x-www-form-urlencoded
    const contentType = req.headers.get("content-type") || "";
    let sessionId = "";
    let serviceCode = "";
    let phoneNumber = "";
    let text = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      sessionId = formData.get("sessionId")?.toString() || "";
      serviceCode = formData.get("serviceCode")?.toString() || "";
      phoneNumber = formData.get("phoneNumber")?.toString() || "";
      text = formData.get("text")?.toString() || "";
    } else {
      // Fallback for JSON requests (like our simulator)
      const body = await req.json();
      sessionId = body.sessionId || "";
      serviceCode = body.serviceCode || "";
      phoneNumber = body.phoneNumber || "";
      text = body.text || "";
    }

    const dbPhone = normalizePhone(phoneNumber);
    console.log(`USSD Session ${sessionId}: phone=${phoneNumber} -> dbPhone=${dbPhone}, text="${text}"`);

    // 1. Fetch user by phone
    const user = await prisma.user.findUnique({
      where: { phone: dbPhone }
    });

    if (!user) {
      return new Response(`END Welcome to AjoCircles.\nYour phone number (${dbPhone}) is not registered. Please register on the web app first.`, {
        headers: { "Content-Type": "text/plain" }
      });
    }

    const parts = text === "" ? [] : text.split("*");
    const mainOption = parts[0];

    // --- MAIN MENU ---
    if (parts.length === 0) {
      const menu = `CON Welcome to AjoCircles, ${user.name}!\nChoose an option:\n1. Join a Circle\n2. Check My Status\n3. My Circles\n4. Pay Now`;
      return new Response(menu, { headers: { "Content-Type": "text/plain" } });
    }

    // --- OPTION 1: JOIN A CIRCLE ---
    // Flow: 1 -> invite code -> PIN
    if (mainOption === "1") {
      if (parts.length === 1) {
        return new Response("CON Enter circle invite code:", { headers: { "Content-Type": "text/plain" } });
      }
      
      if (parts.length === 2) {
        return new Response("CON Enter your 4-digit PIN to confirm:", { headers: { "Content-Type": "text/plain" } });
      }

      if (parts.length === 3) {
        const inviteCode = parts[1].trim().toUpperCase();
        const pin = parts[2].trim();

        // Verify PIN
        const isPinValid = await comparePin(pin, user.pinHash);
        if (!isPinValid) {
          return new Response("END Invalid PIN. Session closed.", { headers: { "Content-Type": "text/plain" } });
        }

        // Fetch Circle
        const circle = await prisma.circle.findUnique({
          where: { inviteCode },
          include: {
            members: true
          }
        });

        if (!circle) {
          return new Response("END Circle not found. Please verify the invite code.", { headers: { "Content-Type": "text/plain" } });
        }

        if (circle.status !== "ACTIVE") {
          return new Response("END This circle is no longer active.", { headers: { "Content-Type": "text/plain" } });
        }

        // Check if already a member
        const alreadyMember = circle.members.some((m) => m.userId === user.id);
        if (alreadyMember) {
          return new Response("END You are already a member of this circle.", { headers: { "Content-Type": "text/plain" } });
        }

        // Check if full
        if (circle.members.length >= circle.memberCount) {
          return new Response("END This circle is already full.", { headers: { "Content-Type": "text/plain" } });
        }

        const currentMemberIndex = circle.members.length;
        const isNowFull = currentMemberIndex + 1 === circle.memberCount;

        // Perform Join in Transaction
        const joinResult = await prisma.$transaction(async (tx) => {
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
            const memberIds = allMembers.map((m) => m.id);
            if (circle.payoutOrderType === "RANDOM") {
              finalPayoutOrder = shuffleArray(memberIds);
              for (let i = 0; i < finalPayoutOrder.length; i++) {
                const memberId = finalPayoutOrder[i];
                await tx.circleMember.update({
                  where: { id: memberId },
                  data: { payoutPosition: i },
                });
              }
            } else {
              finalPayoutOrder = memberIds;
            }

            const firstRecipientId = finalPayoutOrder[0];

            await tx.circle.update({
              where: { id: circle.id },
              data: {
                payoutOrder: finalPayoutOrder,
                currentRecipientId: firstRecipientId,
                currentCycleNumber: 1,
              }
            });

            // Initialize Cycle 1 Contributions
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
            const currentPayoutOrder = Array.isArray(circle.payoutOrder) ? (circle.payoutOrder as string[]) : [];
            await tx.circle.update({
              where: { id: circle.id },
              data: {
                payoutOrder: [...currentPayoutOrder, newMember.id],
              }
            });
          }

          return newMember;
        });

        // Provision reserved account
        const reservedAccountResult = await createReservedAccount({
          memberId: joinResult.id,
          memberName: user.name,
          memberEmail: user.email,
          circleId: circle.id,
          circleName: circle.name,
        });

        let accountMsg = "";
        if (reservedAccountResult.success) {
          await prisma.circleMember.update({
            where: { id: joinResult.id },
            data: {
              monnifyReservedAccountNumber: reservedAccountResult.accountNumber,
              monnifyBankName: reservedAccountResult.bankName,
              monnifyBankCode: reservedAccountResult.bankCode,
            }
          });
          accountMsg = `\nPay to: ${reservedAccountResult.bankName}\nAcct: ${reservedAccountResult.accountNumber}`;
        }

        const successText = isNowFull
          ? `END Joined ${circle.name}! The circle is full. Cycle 1 has started. Contribution: NGN ${circle.contributionAmount}.${accountMsg}`
          : `END Joined ${circle.name} successfully! Waiting for other members to join.${accountMsg}`;

        return new Response(successText, { headers: { "Content-Type": "text/plain" } });
      }
    }

    // --- OPTION 2: CHECK MY STATUS ---
    // Flow: 2 -> list circles -> select circle -> show details
    if (mainOption === "2") {
      const userMemberships = await prisma.circleMember.findMany({
        where: { userId: user.id },
        include: { circle: true }
      });

      if (userMemberships.length === 0) {
        return new Response("END You do not belong to any circles. Join a circle first.", { headers: { "Content-Type": "text/plain" } });
      }

      if (parts.length === 1) {
        let menu = "CON Select a Circle to Check:\n";
        userMemberships.forEach((m, idx) => {
          menu += `${idx + 1}. ${m.circle.name}\n`;
        });
        return new Response(menu, { headers: { "Content-Type": "text/plain" } });
      }

      if (parts.length === 2) {
        const index = parseInt(parts[1]) - 1;
        if (isNaN(index) || index < 0 || index >= userMemberships.length) {
          return new Response("END Invalid selection.", { headers: { "Content-Type": "text/plain" } });
        }

        const selectedMember = userMemberships[index];
        const circle = selectedMember.circle;

        // Fetch contribution for current cycle
        const contribution = await prisma.contribution.findUnique({
          where: {
            circleId_memberId_cycleNumber: {
              circleId: circle.id,
              memberId: selectedMember.id,
              cycleNumber: circle.currentCycleNumber,
            }
          }
        });

        // Determine recipient name
        let recipientName = "None";
        if (circle.currentRecipientId) {
          const recipientMember = await prisma.circleMember.findUnique({
            where: { id: circle.currentRecipientId },
            include: { user: true }
          });
          if (recipientMember) {
            recipientName = recipientMember.user.name;
          }
        }

        const isPaid = contribution?.status === "PAID" ? "YES" : "NO";
        const responseText = `END Circle: ${circle.name}\nCycle: ${circle.currentCycleNumber}/${circle.memberCount}\nContribution Paid: ${isPaid}\nRecipient: ${recipientName}\nAmount: NGN ${circle.contributionAmount}\nStatus: ${circle.status}`;
        
        return new Response(responseText, { headers: { "Content-Type": "text/plain" } });
      }
    }

    // --- OPTION 3: MY CIRCLES ---
    // Flow: 3
    if (mainOption === "3") {
      const userMemberships = await prisma.circleMember.findMany({
        where: { userId: user.id },
        include: { circle: true }
      });

      if (userMemberships.length === 0) {
        return new Response("END You do not belong to any circles.", { headers: { "Content-Type": "text/plain" } });
      }

      let responseText = "END Your Circles:\n";
      userMemberships.forEach((m, idx) => {
        responseText += `${idx + 1}. ${m.circle.name} (Cycle ${m.circle.currentCycleNumber}, Status: ${m.circle.status})\n`;
      });

      return new Response(responseText, { headers: { "Content-Type": "text/plain" } });
    }

    // --- OPTION 4: PAY NOW ---
    // Flow: 4 -> list circles -> select circle -> show payment account
    if (mainOption === "4") {
      const userMemberships = await prisma.circleMember.findMany({
        where: { userId: user.id },
        include: { circle: true }
      });

      if (userMemberships.length === 0) {
        return new Response("END You do not belong to any circles. Join one to contribute.", { headers: { "Content-Type": "text/plain" } });
      }

      if (parts.length === 1) {
        let menu = "CON Select Circle to Pay:\n";
        userMemberships.forEach((m, idx) => {
          menu += `${idx + 1}. ${m.circle.name}\n`;
        });
        return new Response(menu, { headers: { "Content-Type": "text/plain" } });
      }

      if (parts.length === 2) {
        const index = parseInt(parts[1]) - 1;
        if (isNaN(index) || index < 0 || index >= userMemberships.length) {
          return new Response("END Invalid selection.", { headers: { "Content-Type": "text/plain" } });
        }

        const selectedMember = userMemberships[index];
        const circle = selectedMember.circle;

        if (circle.status !== "ACTIVE") {
          return new Response(`END This circle is completed or inactive.`, { headers: { "Content-Type": "text/plain" } });
        }

        const bankName = selectedMember.monnifyBankName || "Monnify Virtual Bank";
        const accountNumber = selectedMember.monnifyReservedAccountNumber || "Not Provisioned";

        const textResponse = `END Pay NGN ${circle.contributionAmount} for Cycle ${circle.currentCycleNumber} to:\nBank: ${bankName}\nAccount: ${accountNumber}\n\nTransfer from your banking app or dial your bank USSD code.`;
        return new Response(textResponse, { headers: { "Content-Type": "text/plain" } });
      }
    }

    return new Response("END Invalid option selection.", { headers: { "Content-Type": "text/plain" } });

  } catch (error: any) {
    console.error("USSD Request Error:", error);
    return new Response("END System error. Please try again later.", { headers: { "Content-Type": "text/plain" } });
  }
}
