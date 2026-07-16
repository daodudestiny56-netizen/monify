import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "ajo-circles-fallback-secret-key-123456";

export interface JWTPayload {
  userId: string;
  phone: string;
  name: string;
}

// Hash PIN
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

// Compare PIN
export async function comparePin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

// Sign JWT
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Verify JWT
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Get user from current session cookie
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ajo_session")?.value;
    
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) return null;
    
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      payoutBankAccountNumber: user.payoutBankAccountNumber,
      payoutBankCode: user.payoutBankCode,
      payoutBankName: user.payoutBankName,
    };
  } catch (error) {
    console.error("Error getting session user:", error);
    return null;
  }
}
