import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, pin, payoutBankAccountNumber, payoutBankCode, payoutBankName } = body;

    // Validate inputs
    if (!name || !phone || !pin) {
      return NextResponse.json(
        { error: "Name, phone number, and PIN are required." },
        { status: 400 }
      );
    }

    if (pin.length < 4) {
      return NextResponse.json(
        { error: "PIN must be at least 4 digits." },
        { status: 400 }
      );
    }

    // Normalise phone number format (standardise)
    const normalizedPhone = phone.trim();

    // Check if phone number is already registered
    const existingUser = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this phone number already exists." },
        { status: 400 }
      );
    }

    // Hash the PIN
    const pinHash = await hashPin(pin);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        email: email ? email.trim().toLowerCase() : null,
        pinHash,
        payoutBankAccountNumber: payoutBankAccountNumber ? payoutBankAccountNumber.trim() : null,
        payoutBankCode: payoutBankCode ? payoutBankCode.trim() : null,
        payoutBankName: payoutBankName ? payoutBankName.trim() : null,
      }
    });

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
      message: "Registration successful",
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong during registration." },
      { status: 500 }
    );
  }
}
