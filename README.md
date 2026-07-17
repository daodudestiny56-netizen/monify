# AjoCircles ₦

AjoCircles is a digitized platform for traditional rotating savings and credit associations (ROSCA) widely known as **Ajo** or **Esusu** in Nigeria. 

The platform enables groups of people to form a "circle," contribute a fixed amount on a schedule (weekly/monthly), and rotate the full payout pot to one member each cycle. It features integration with the **Monnify Sandbox API** for virtual reserved accounts and automated disbursements, and supports an interactive **USSD flow** for offline users.

---

## Features

1. **communal Nigerian Design System**: Custom theme styled in Naira Green, Sunlight Gold, and Terracotta Clay, featuring an interactive SVG **Payout Wheel** showing rotation status.
2. **Monnify virtual accounts**: Automated reserved account provisioning for members to pay in.
3. **Auto-payouts & Disbursements**: Automated disbursement of the lump sum to the current recipient once all contributions are paid.
4. **Interactive USSD emulator**: A built-in classic feature-phone emulator in the UI that connects to the live `/api/ussd` endpoint to simulate offline dial flows (`*384*30#`).
5. **Admin Override**: Circle creator can manually clear pending contributions for offline cash users.

---

## Technical Stack

- **Frontend**: Next.js (App Router) + React + TypeScript + Tailwind CSS (v4)
- **Database**: PostgreSQL via Prisma ORM (Prisma 7 driver adapter architecture)
- **Auth**: Simple phone/email + PIN (hashed with `bcryptjs`), JWT cookie sessions

---

## Getting Started

### 1. Installation
Clone/extract the project to your local directory and install the packages:
```bash
npm install
```

### 2. Environment Setup
Copy the `.env.example` file to `.env`:
```bash
copy .env.example .env
```
Fill in the following variables:
- `DATABASE_URL`: A valid PostgreSQL connection string (Supabase, Neon, or local).
- `JWT_SECRET`: A secure key for signing sessions.
- `MONNIFY_API_KEY` & `MONNIFY_SECRET_KEY`: (Optional) Sandbox credentials. If empty, the app runs in **Mock Sandbox Mode** where reserved accounts and disbursements are simulated automatically.

### 3. Database Initialization
Once you have supplied a PostgreSQL connection string in `.env`:
1. Push the database schema to your database instance:
   ```bash
   npx prisma db push
   ```
2. Generate the Prisma Client types:
   ```bash
   npx prisma generate
   ```
3. Run the database seed script to populate the app with 4 realistic users and a circle mid-cycle (Cycle 2 out of 4, with 3 members paid and 1 pending):
   ```bash
   npx prisma db seed
   ```

### 4. Running the Development Server
Start the local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the landing page.

---

## How to Test

### 1. Seeding Data Accounts
The seed script generates 4 pre-registered users with a shared PIN **`1234`**:
- **Chinedu Obi** (`08012345678`) - Circle Admin
- **Funmi Adebayo** (`08023456789`) - Cycle 2 Recipient
- **Ibrahim Musa** (`08034567890`)
- **Chioma Nwachukwu** (`08045678901`) - Pending Member

### 2. Live Webhook Simulation
1. Log in with **Chinedu Obi** (`08012345678` / PIN: `1234`) on the web dashboard.
2. In the right panel, you will see a **"Simulate Webhook Payment"** button under your virtual account.
3. Since **Chioma Nwachukwu** is the only pending member for Cycle 2, change the "Active Phone Number" in the USSD simulator dropdown to **Chioma Nwachukwu** and dial.
4. Go to Option 4 (Pay Now), select "Ajegunle Traders", and copy Chioma's virtual account number (e.g. `9924095867`).
5. You can trigger a mock payment for Chioma's account. This fires a POST to `/api/webhooks/monnify` with Chioma's account number.
6. The app detects the payment, marks Chioma paid, completes the cycle, automatically triggers the Monnify disbursement to Funmi's personal account, and rotates to Cycle 3! Watch the SVG Payout Wheel animate and update in real-time.

### 3. USSD Dial Flow (Phone Emulator)
On the left-hand side of the dashboard, you will find a virtual phone. 
- Ensure you select the active simulator user from the dropdown above the phone.
- Dial by clicking **SEND**.
- Keypad interactions:
  - **1**: Join a Circle (input invite code `TRADER`, PIN `1234`).
  - **2**: Check Status (Paid/Pending, current recipient name, cycle count).
  - **3**: List my circles.
  - **4**: View payment account instructions.
