import crypto from "crypto";

const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY;
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY;
const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com";
const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE || "1234567890";
const MONNIFY_WALLET_ACCOUNT_NUMBER = process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || "0123456789";

interface TokenResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    accessToken: string;
    expiresIn: number;
  };
}

interface ReservedAccountResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    contractCode: string;
    accountReference: string;
    accountName: string;
    currencyCode: string;
    customerEmail: string;
    customerName: string;
    accounts: Array<{
      bankName: string;
      bankCode: string;
      accountNumber: string;
    }>;
  };
}

// Memory cache for Monnify Auth Token
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

// Authenticate with Monnify and get Access Token
async function getAccessToken(): Promise<string | null> {
  if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY) {
    console.warn("Monnify API Key or Secret Key is not configured. Running in MOCK mode.");
    return null;
  }

  const now = Date.now();
  if (cachedToken && now < tokenExpiryTime) {
    return cachedToken;
  }

  try {
    const authString = Buffer.from(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`).toString("base64");
    const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Monnify Auth Error:", errorText);
      return null;
    }

    const data = (await response.json()) as TokenResponse;
    if (data.requestSuccessful) {
      cachedToken = data.responseBody.accessToken;
      // Expire 1 minute early for safety
      tokenExpiryTime = now + (data.responseBody.expiresIn - 60) * 1000;
      return cachedToken;
    }
  } catch (error) {
    console.error("Error fetching Monnify access token:", error);
  }
  return null;
}

// 1. Create Reserved Account for a Member in a Circle
export async function createReservedAccount(params: {
  memberId: string;
  memberName: string;
  memberEmail?: string | null;
  circleId: string;
  circleName: string;
}) {
  const { memberId, memberName, memberEmail, circleId, circleName } = params;
  const accountReference = `ref_${memberId}_${circleId}`;
  const accountName = `Ajo-${circleName.slice(0, 10)}-${memberName.slice(0, 15)}`;
  const email = memberEmail || `member_${memberId}@ajocircles.com`;

  const token = await getAccessToken();
  
  // If no credentials, operate in Mock/Stub Mode
  if (!token) {
    console.log(`[MONNIFY MOCK] Provisioning reserved virtual account for Member ${memberId} in Circle ${circleId}`);
    // Return realistic Wema Bank mock account details
    const mockAccountNumber = "992" + Math.floor(1000000 + Math.random() * 9000000).toString();
    return {
      success: true,
      accountNumber: mockAccountNumber,
      bankName: "Wema Bank (Ajo Sandbox)",
      bankCode: "035",
      reference: accountReference,
    };
  }

  try {
    const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/bank-transfer/reserved-accounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountReference,
        accountName,
        currencyCode: "NGN",
        contractCode: MONNIFY_CONTRACT_CODE,
        customerEmail: email,
        customerName: memberName,
        getAllOneTimeAddresses: false,
      }),
    });

    const data = (await response.json()) as ReservedAccountResponse;
    if (data.requestSuccessful && data.responseBody.accounts.length > 0) {
      const primaryAccount = data.responseBody.accounts[0];
      return {
        success: true,
        accountNumber: primaryAccount.accountNumber,
        bankName: primaryAccount.bankName,
        bankCode: primaryAccount.bankCode,
        reference: accountReference,
      };
    } else {
      console.error("Monnify reserved account creation failed:", data.responseMessage);
      return {
        success: false,
        error: data.responseMessage,
      };
    }
  } catch (error: any) {
    console.error("Error creating Monnify reserved account:", error);
    return {
      success: false,
      error: error.message || "Failed to call Monnify reserved accounts API",
    };
  }
}

// 2. Webhook Signature Verification
export function verifyWebhookSignature(signature: string, requestBody: string): boolean {
  if (!MONNIFY_SECRET_KEY) {
    // If running in development without keys, allow all signatures for ease of mock testing
    console.warn("MONNIFY_SECRET_KEY is not set. Webhook signature verification is MOCK-PASSED.");
    return true;
  }

  try {
    const hmac = crypto.createHmac("sha512", MONNIFY_SECRET_KEY);
    hmac.update(requestBody);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

// 3. Trigger Disbursement
export async function triggerDisbursement(params: {
  payoutId: string;
  circleName: string;
  cycleNumber: number;
  amount: number;
  destinationBankCode: string;
  destinationAccountNumber: string;
  destinationAccountName: string;
}) {
  const {
    payoutId,
    circleName,
    cycleNumber,
    amount,
    destinationBankCode,
    destinationAccountNumber,
    destinationAccountName,
  } = params;

  const reference = `payout_${payoutId}`;
  const token = await getAccessToken();

  if (!token) {
    console.log(`[MONNIFY MOCK] Single single-disbursement triggered:
      Payout ID: ${payoutId}
      Amount: NGN ${amount}
      To Account: ${destinationAccountNumber} (${destinationAccountName}) at Bank Code: ${destinationBankCode}
      Reference: ${reference}`);
    
    return {
      success: true,
      transactionReference: `mock_tx_${crypto.randomUUID()}`,
      status: "SUCCESS",
    };
  }

  try {
    const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/disbursements/single`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        reference,
        paymentDescription: `Ajo payout: ${circleName} - Cycle ${cycleNumber}`,
        destinationBankCode,
        destinationAccountNumber,
        destinationAccountName,
        sourceAccountNumber: MONNIFY_WALLET_ACCOUNT_NUMBER,
        currency: "NGN",
      }),
    });

    const data = await response.json();
    if (data.requestSuccessful) {
      return {
        success: true,
        transactionReference: data.responseBody.transactionReference,
        status: data.responseBody.status, // SUCCESS, PENDING, FAILED
      };
    } else {
      console.error("Monnify disbursement failed:", data.responseMessage);
      return {
        success: false,
        error: data.responseMessage,
      };
    }
  } catch (error: any) {
    console.error("Error triggering disbursement:", error);
    return {
      success: false,
      error: error.message || "Failed to trigger disbursement",
    };
  }
}
