import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { confirmContributionPayment } from "@/services/cycle";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circleId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { memberId, cycleNumber } = body;

    if (!memberId || !cycleNumber) {
      return NextResponse.json(
        { error: "Member ID and cycle number are required." },
        { status: 400 }
      );
    }

    // Fetch the circle to verify admin status
    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      include: {
        members: true
      }
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }

    // Verify user is the admin of the circle
    if (circle.adminUserId !== user.id) {
      return NextResponse.json(
        { error: "Access denied. Only the circle admin can perform manual payment overrides." },
        { status: 403 }
      );
    }

    if (circle.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Cannot register payment. This circle is not currently active." },
        { status: 400 }
      );
    }

    // Verify member exists in this circle
    const memberExists = circle.members.some((m) => m.id === memberId);
    if (!memberExists) {
      return NextResponse.json(
        { error: "Member is not registered in this circle." },
        { status: 400 }
      );
    }

    // Process the payment confirmation using our shared advanced logic
    const ref = `manual_${circleId}_${memberId}_c${cycleNumber}_${Date.now()}`;
    const result = await confirmContributionPayment({
      circleId,
      memberId,
      cycleNumber: parseInt(cycleNumber),
      transactionRef: ref,
    });

    return NextResponse.json({
      message: "Payment registered successfully.",
      result,
    });
  } catch (error: any) {
    console.error("Manual override payment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to confirm payment manually." },
      { status: 500 }
    );
  }
}
