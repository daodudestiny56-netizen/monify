import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/services/monify";
import { prisma } from "@/lib/db";
import { confirmContributionPayment } from "@/services/cycle";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("monnify-signature") || "";

    const isSignatureValid = verifyWebhookSignature(signature, rawBody);
    if (!isSignatureValid) {
      console.warn("Unauthorized webhook payload: signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log("Monnify Webhook Payload received:", JSON.stringify(payload, null, 2));

    const { eventType, eventData } = payload;

    if (eventType !== "SUCCESSFUL_TRANSACTION") {
      return NextResponse.json({ message: "Event type ignored." }, { status: 200 });
    }

    if (!eventData) {
      return NextResponse.json({ error: "Missing event data." }, { status: 400 });
    }

    const { transactionReference, amountPaid } = eventData;
    
    let circleId: string | null = null;
    let memberId: string | null = null;

    const accountNumber = eventData.destinationAccountPaymentInformation?.accountNumber;
    if (accountNumber) {
      const member = await prisma.circleMember.findFirst({
        where: { monnifyReservedAccountNumber: accountNumber }
      });
      if (member) {
        circleId = member.circleId;
        memberId = member.id;
      }
    }

    const productRef = eventData.product?.reference;
    if ((!circleId || !memberId) && productRef && productRef.startsWith("ref_")) {
      const parts = productRef.split("_");
      if (parts.length >= 3) {
        memberId = parts[1];
        circleId = parts[2];
      }
    }

    if (!circleId || !memberId) {
      console.warn(`Could not resolve member or circle for webhook. Account: ${accountNumber}, Ref: ${productRef}`);
      return NextResponse.json(
        { error: "Could not associate payment with a savings circle member" },
        { status: 400 }
      );
    }

    const circle = await prisma.circle.findUnique({
      where: { id: circleId }
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    if (circle.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Circle is not currently active" },
        { status: 400 }
      );
    }

    const result = await confirmContributionPayment({
      circleId,
      memberId,
      cycleNumber: circle.currentCycleNumber,
      transactionRef: transactionReference || `monnify_${Date.now()}`,
    });

    if (!result.success) {
      return NextResponse.json({
        error: result.error || "Failed to confirm payment"
      }, { status: 400 });
    }

    console.log(`Payment confirmed via webhook: Circle ${circleId}, Member ${memberId}, Cycle ${circle.currentCycleNumber}`);

    return NextResponse.json({
      message: "Webhook processed successfully",
      result,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Monnify Webhook Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}
