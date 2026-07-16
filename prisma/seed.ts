import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Setup client
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is required to run the seed script.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Clear database
  await prisma.contribution.deleteMany({});
  await prisma.payout.deleteMany({});
  await prisma.circleMember.deleteMany({});
  await prisma.circle.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash PIN "1234"
  const pinHash = await bcrypt.hash("1234", 10);

  // 2. Create Users
  const u1 = await prisma.user.create({
    data: {
      name: "Chinedu Obi",
      phone: "08012345678",
      email: "chinedu@ajocircles.com",
      pinHash,
      payoutBankAccountNumber: "1029384756",
      payoutBankCode: "058", // GTBank
      payoutBankName: "Guaranty Trust Bank",
    }
  });

  const u2 = await prisma.user.create({
    data: {
      name: "Funmi Adebayo",
      phone: "08023456789",
      email: "funmi@ajocircles.com",
      pinHash,
      payoutBankAccountNumber: "2093847561",
      payoutBankCode: "011", // First Bank
      payoutBankName: "First Bank of Nigeria",
    }
  });

  const u3 = await prisma.user.create({
    data: {
      name: "Ibrahim Musa",
      phone: "08034567890",
      email: "ibrahim@ajocircles.com",
      pinHash,
      payoutBankAccountNumber: "3094857612",
      payoutBankCode: "033", // UBA
      payoutBankName: "United Bank for Africa",
    }
  });

  const u4 = await prisma.user.create({
    data: {
      name: "Chioma Nwachukwu",
      phone: "08045678901",
      email: "chioma@ajocircles.com",
      pinHash,
      payoutBankAccountNumber: "4095867123",
      payoutBankCode: "035", // Wema Bank
      payoutBankName: "Wema Bank",
    }
  });

  console.log("Users created successfully.");

  // 3. Create Circle
  const circle = await prisma.circle.create({
    data: {
      name: "Ajegunle Traders",
      adminUserId: u1.id,
      contributionAmount: 10000.0,
      frequency: "WEEKLY",
      memberCount: 4,
      payoutOrder: [], // Updated below
      payoutOrderType: "FIXED",
      currentCycleNumber: 2,
      currentRecipientId: null, // Updated below
      status: "ACTIVE",
      inviteCode: "TRADER",
    }
  });

  // 4. Create CircleMembers
  const m1 = await prisma.circleMember.create({
    data: {
      circleId: circle.id,
      userId: u1.id,
      payoutPosition: 0,
      monnifyReservedAccountNumber: "9921029384",
      monnifyBankName: "Wema Bank (Ajo Sandbox)",
      monnifyBankCode: "035",
    }
  });

  const m2 = await prisma.circleMember.create({
    data: {
      circleId: circle.id,
      userId: u2.id,
      payoutPosition: 1,
      monnifyReservedAccountNumber: "9922093847",
      monnifyBankName: "Wema Bank (Ajo Sandbox)",
      monnifyBankCode: "035",
    }
  });

  const m3 = await prisma.circleMember.create({
    data: {
      circleId: circle.id,
      userId: u3.id,
      payoutPosition: 2,
      monnifyReservedAccountNumber: "9923094857",
      monnifyBankName: "Wema Bank (Ajo Sandbox)",
      monnifyBankCode: "035",
    }
  });

  const m4 = await prisma.circleMember.create({
    data: {
      circleId: circle.id,
      userId: u4.id,
      payoutPosition: 3,
      monnifyReservedAccountNumber: "9924095867",
      monnifyBankName: "Wema Bank (Ajo Sandbox)",
      monnifyBankCode: "035",
    }
  });

  // Update circle payoutOrder and currentRecipientId
  await prisma.circle.update({
    where: { id: circle.id },
    data: {
      payoutOrder: [m1.id, m2.id, m3.id, m4.id],
      currentRecipientId: m2.id, // Funmi (position 1) is recipient of cycle 2
    }
  });

  console.log("Members added and circle rotation established.");

  // 5. Seed Cycle 1 (Completed Cycle)
  // All paid, payout sent to m1 (Chinedu)
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  
  await prisma.contribution.createMany({
    data: [
      { circleId: circle.id, memberId: m1.id, cycleNumber: 1, amount: 10000.0, status: "PAID", paidAt: pastDate, monnifyTransactionRef: "ref_seed_c1_m1" },
      { circleId: circle.id, memberId: m2.id, cycleNumber: 1, amount: 10000.0, status: "PAID", paidAt: pastDate, monnifyTransactionRef: "ref_seed_c1_m2" },
      { circleId: circle.id, memberId: m3.id, cycleNumber: 1, amount: 10000.0, status: "PAID", paidAt: pastDate, monnifyTransactionRef: "ref_seed_c1_m3" },
      { circleId: circle.id, memberId: m4.id, cycleNumber: 1, amount: 10000.0, status: "PAID", paidAt: pastDate, monnifyTransactionRef: "ref_seed_c1_m4" },
    ]
  });

  await prisma.payout.create({
    data: {
      circleId: circle.id,
      cycleNumber: 1,
      recipientMemberId: m1.id,
      amount: 40000.0,
      status: "PAID",
      paidAt: pastDate,
      monnifyDisbursementRef: "disb_seed_c1",
    }
  });

  console.log("Cycle 1 completed data seeded.");

  // 6. Seed Cycle 2 (Active Cycle, Mid-cycle)
  // m1, m2, m3 paid. m4 (Chioma) is PENDING.
  // Payout is pending to m2 (Funmi) once m4 pays.
  const today = new Date();

  await prisma.contribution.createMany({
    data: [
      { circleId: circle.id, memberId: m1.id, cycleNumber: 2, amount: 10000.0, status: "PAID", paidAt: today, monnifyTransactionRef: "ref_seed_c2_m1" },
      { circleId: circle.id, memberId: m2.id, cycleNumber: 2, amount: 10000.0, status: "PAID", paidAt: today, monnifyTransactionRef: "ref_seed_c2_m2" },
      { circleId: circle.id, memberId: m3.id, cycleNumber: 2, amount: 10000.0, status: "PAID", paidAt: today, monnifyTransactionRef: "ref_seed_c2_m3" },
      { circleId: circle.id, memberId: m4.id, cycleNumber: 2, amount: 10000.0, status: "PENDING" }, // Chioma is pending
    ]
  });

  console.log("Cycle 2 active data seeded (3/4 paid, Chioma pending).");
  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
