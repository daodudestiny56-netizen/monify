import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circleId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a member of this circle
    const member = await prisma.circleMember.findFirst({
      where: {
        circleId,
        userId: user.id,
      }
    });

    if (!member) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this circle." },
        { status: 403 }
      );
    }

    // Fetch complete Circle details
    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      include: {
        members: {
          orderBy: { payoutPosition: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                payoutBankAccountNumber: true,
                payoutBankCode: true,
                payoutBankName: true,
              }
            }
          }
        },
        contributions: {
          orderBy: { cycleNumber: "desc" },
        },
        payouts: {
          orderBy: { cycleNumber: "desc" },
          include: {
            recipient: {
              include: {
                user: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Filter contributions for the current cycle
    const currentCycleContributions = circle.contributions.filter(
      (c) => c.cycleNumber === circle.currentCycleNumber
    );

    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        adminUserId: circle.adminUserId,
        contributionAmount: circle.contributionAmount,
        frequency: circle.frequency,
        memberCount: circle.memberCount,
        payoutOrder: circle.payoutOrder,
        payoutOrderType: circle.payoutOrderType,
        currentCycleNumber: circle.currentCycleNumber,
        currentRecipientId: circle.currentRecipientId,
        status: circle.status,
        inviteCode: circle.inviteCode,
        createdAt: circle.createdAt,
      },
      members: circle.members,
      currentCycleContributions,
      payouts: circle.payouts,
      myMemberId: member.id,
    });
  } catch (error: any) {
    console.error("Fetch circle details error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch circle details." },
      { status: 500 }
    );
  }
}
