import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePin, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, pin } = body;

    if (!phone || !pin) {
      return NextResponse.json(
        { error: "Phone number and PIN are required." },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.trim();

    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid phone number or PIN." },
        { status: 400 }
      );
    }

    // Verify PIN
    const isValid = await comparePin(pin, user.pinHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid phone number or PIN." },
        { status: 400 }
      );
    }

    // Create session token
    const token = signToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("ajo_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        payoutBankAccountNumber: user.payoutBankAccountNumber,
        payoutBankCode: user.payoutBankCode,
        payoutBankName: user.payoutBankName,
      }
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong during login." },
      { status: 500 }
    );
  }
}
