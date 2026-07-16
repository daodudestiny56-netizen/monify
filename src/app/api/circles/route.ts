import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createReservedAccount } from "@/services/monify";

// Helper to generate a unique 6-character alphanumeric invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/circles - List all circles the user is in
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await prisma.circleMember.findMany({
      where: { userId: user.id },
      include: {
        circle: {
          include: {
            members: {
              include: {
                user: {
                  select: { name: true, phone: true }
                }
              }
            }
          }
        }
      }
    });

    const circles = members.map((m) => m.circle);
    return NextResponse.json({ circles });
  } catch (error: any) {
    console.error("List circles error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list circles." },
      { status: 500 }
    );
  }
}

// POST /api/circles - Create a new circle
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, contributionAmount, frequency, memberCount, payoutOrderType } = body;

    if (!name || !contributionAmount || !frequency || !memberCount) {
      return NextResponse.json(
        { error: "Name, contribution amount, frequency, and member count are required." },
        { status: 400 }
      );
    }

    const parsedContributionAmount = parseFloat(contributionAmount);
    const parsedMemberCount = parseInt(memberCount);

    if (isNaN(parsedContributionAmount) || parsedContributionAmount <= 0) {
      return NextResponse.json(
        { error: "Contribution amount must be a positive number." },
        { status: 400 }
      );
    }

    if (isNaN(parsedMemberCount) || parsedMemberCount < 2) {
      return NextResponse.json(
        { error: "Member count must be at least 2." },
        { status: 400 }
      );
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let codeExists = true;
    while (codeExists) {
      const existing = await prisma.circle.findUnique({ where: { inviteCode } });
      if (!existing) {
        codeExists = false;
      } else {
        inviteCode = generateInviteCode();
      }
    }

    // Create the circle and the creator as member #0 using a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Circle
      const circle = await tx.circle.create({
        data: {
          name: name.trim(),
          adminUserId: user.id,
          contributionAmount: parsedContributionAmount,
          frequency,
          memberCount: parsedMemberCount,
          payoutOrder: [], // Will be finalised when circle fills up
          payoutOrderType: payoutOrderType === "RANDOM" ? "RANDOM" : "FIXED",
          inviteCode,
        }
      });

      // 2. Add creator as first CircleMember (payoutPosition = 0)
      const member = await tx.circleMember.create({
        data: {
          circleId: circle.id,
          userId: user.id,
          payoutPosition: 0,
        }
      });

      return { circle, member };
    });

    // 3. Provision Monnify Reserved Account for admin member
    const reservedAccountResult = await createReservedAccount({
      memberId: result.member.id,
      memberName: user.name,
      memberEmail: user.email,
      circleId: result.circle.id,
      circleName: result.circle.name,
    });

    if (reservedAccountResult.success) {
      // Save Monnify account details in database
      await prisma.circleMember.update({
        where: { id: result.member.id },
        data: {
          monnifyReservedAccountNumber: reservedAccountResult.accountNumber,
          monnifyBankName: reservedAccountResult.bankName,
          monnifyBankCode: reservedAccountResult.bankCode,
        }
      });
    }

    // Update payoutOrder list in circle to include creator
    const updatedCircle = await prisma.circle.update({
      where: { id: result.circle.id },
      data: {
        payoutOrder: [result.member.id],
      },
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

    return NextResponse.json({
      message: "Circle created successfully",
      circle: updatedCircle,
      inviteCode,
    });
  } catch (error: any) {
    console.error("Create circle error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create circle." },
      { status: 500 }
    );
  }
}
