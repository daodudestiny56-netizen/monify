import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AjoCircles — Digitized Rotating Savings & Esusu",
  description: "Join communal rotating savings circles (Ajo/Esusu). Auto-collect contributions via Monnify, auto-disburse payouts, and connect using USSD on any mobile phone.",
  keywords: ["Ajo", "Esusu", "Rotating Savings", "Nigeria", "Fintech", "Monnify", "USSD", "Africa's Talking"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-warm-linen text-charcoal">
        {children}
      </body>
    </html>
  );
}
