"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, ShieldCheck, PhoneCall, ArrowRight, ArrowLeftRight, Landmark, Layers } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "login" | "register" }>({
    isOpen: false,
    mode: "login",
  });

  // Form states
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankCode, setBankCode] = useState("058"); // Default GTB
  const [bankName, setBankName] = useState("Guaranty Trust Bank");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bankList = [
    { code: "058", name: "Guaranty Trust Bank" },
    { code: "011", name: "First Bank of Nigeria" },
    { code: "033", name: "United Bank for Africa" },
    { code: "035", name: "Wema Bank" },
    { code: "044", name: "Access Bank" },
    { code: "070", name: "Fidelity Bank" },
    { code: "214", name: "First City Monument Bank" },
    { code: "030", name: "Heritage Bank" },
    { code: "082", name: "Keystone Bank" },
    { code: "076", name: "Polaris Bank" },
    { code: "221", name: "Stanbic IBTC Bank" },
    { code: "232", name: "Sterling Bank" },
    { code: "100", name: "SunTrust Bank" },
    { code: "032", name: "Union Bank of Nigeria" },
    { code: "215", name: "Unity Bank" },
    { code: "015", name: "Zenith Bank" },
  ];

  // Fetch session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error("Check session error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const bank = bankList.find((b) => b.code === selectedCode);
    setBankCode(selectedCode);
    if (bank) {
      setBankName(bank.name);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const endpoint = authModal.mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = 
        authModal.mode === "login" 
          ? { phone, pin }
          : {
              name,
              phone,
              email: email || undefined,
              pin,
              payoutBankAccountNumber: bankAccount,
              payoutBankCode: bankCode,
              payoutBankName: bankName,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setUser(data.user);
      setAuthModal({ isOpen: false, mode: "login" });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-warm-linen">
        <div className="w-12 h-12 rounded-full border-4 border-naira-green border-t-transparent animate-spin"></div>
        <p className="mt-4 font-display font-medium text-charcoal">Loading AjoCircles...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col relative overflow-hidden bg-warm-linen">
      {/* Background Shapes */}
      <div className="bg-shape-green top-[-100px] left-[-150px]"></div>
      <div className="bg-shape-gold bottom-[-50px] right-[-100px]"></div>
      <div className="bg-shape-terracotta top-[40%] left-[60%]"></div>

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-naira-green flex items-center justify-center text-white shadow-md shadow-naira-green/20">
            <span className="font-display font-extrabold text-xl tracking-tight">₦</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-charcoal">Ajo<span className="text-naira-green">Circles</span></span>
        </div>
        
        <nav className="flex items-center gap-4">
          {user ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 bg-naira-green text-white font-semibold rounded-xl hover:bg-naira-green/90 transition shadow-md shadow-naira-green/15 flex items-center gap-2 cursor-pointer"
            >
              Go to Dashboard <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <button
                onClick={() => setAuthModal({ isOpen: true, mode: "login" })}
                className="px-4 py-2 text-charcoal font-semibold hover:text-naira-green transition cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthModal({ isOpen: true, mode: "register" })}
                className="px-5 py-2.5 bg-naira-green text-white font-semibold rounded-xl hover:bg-naira-green/90 transition shadow-md shadow-naira-green/15 cursor-pointer"
              >
                Register
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 lg:py-20 flex-grow flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
        <div className="flex-1 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-naira-green-light text-naira-green font-display font-semibold text-sm mb-6">
            <span className="flex h-2 w-2 rounded-full bg-naira-green animate-pulse"></span>
            Digitizing rotating savings & trust
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-charcoal mb-6">
            Save, Rotate & Pay Out <span className="text-naira-green underline decoration-naira-gold decoration-4 underline-offset-4">With Trust</span>.
          </h1>
          
          <p className="text-lg text-charcoal/80 leading-relaxed mb-8">
            Digitize your traditional rotating savings (Ajo/Esusu). Circle members contribute automatically, while payouts rotate securely via the Monnify API. Anyone can join, pay in, or monitor progress offline using our built-in **USSD flow**.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            {user ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto px-8 py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition shadow-lg shadow-naira-green/20 flex items-center justify-center gap-2 text-lg cursor-pointer"
              >
                Enter Dashboard <ArrowRight size={20} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setAuthModal({ isOpen: true, mode: "register" })}
                  className="w-full sm:w-auto px-8 py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition shadow-lg shadow-naira-green/20 flex items-center justify-center gap-2 text-lg cursor-pointer"
                >
                  Create your first Circle <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => setAuthModal({ isOpen: true, mode: "login" })}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-charcoal border border-charcoal/10 font-bold rounded-xl hover:bg-charcoal/[0.02] transition flex items-center justify-center gap-2 text-lg cursor-pointer"
                >
                  Join existing Circle
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feature Visual */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center">
          <div className="relative w-full aspect-square max-w-[420px] rounded-3xl bg-gradient-to-br from-naira-green/10 to-naira-gold/15 p-6 border border-white/50 shadow-2xl flex flex-col justify-between">
            {/* Visual Header */}
            <div className="flex items-center justify-between border-b border-charcoal/5 pb-4">
              <div>
                <span className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">Ajo Circle</span>
                <h3 className="font-display font-bold text-lg text-charcoal">Ajegunle Traders</h3>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-naira-gold/15 text-naira-gold font-display font-semibold text-sm border border-naira-gold/10">
                Weekly Rotation
              </div>
            </div>

            {/* Simulated Wheel Concept */}
            <div className="flex-grow flex items-center justify-center py-6 relative">
              {/* Outer circle */}
              <div className="w-56 h-56 rounded-full border-[6px] border-charcoal/5 relative flex items-center justify-center">
                {/* Rotating segment overlay */}
                <div className="absolute inset-[-6px] rounded-full border-[6px] border-transparent border-t-naira-green border-r-naira-green rotate-45"></div>
                
                {/* Center pot info */}
                <div className="text-center z-10 px-4">
                  <span className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">Total Pot</span>
                  <div className="font-display font-extrabold text-2xl text-naira-green mt-1">₦40,000</div>
                  <span className="text-[11px] font-medium text-charcoal/60 mt-1 block">3 of 4 paid this week</span>
                </div>

                {/* Shifting icons representing users */}
                <div className="absolute top-[-14px] bg-naira-green text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white">CO</div>
                <div className="absolute right-[-14px] bg-naira-green text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white">FA</div>
                <div className="absolute bottom-[-14px] bg-naira-green text-white font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white">IM</div>
                <div className="absolute left-[-14px] bg-naira-gold-light border-2 border-naira-gold text-naira-gold font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md">CN</div>
              </div>
            </div>

            {/* Visual Footer */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-naira-green-light flex items-center justify-center text-naira-green">
                  <Landmark size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-charcoal">Wema Bank (Reserved)</h4>
                  <p className="text-[10px] font-mono text-charcoal/60">9921029384</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-naira-green bg-naira-green-light px-2.5 py-1 rounded-lg">₦10,000 / member</span>
            </div>
          </div>
        </div>
      </main>

      {/* Grid of features */}
      <section className="bg-charcoal text-white py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-xl mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Digitized for convenience, built for accessibility.
            </h2>
            <p className="text-white/70 leading-relaxed">
              We bridges the gap between digital banking and the realities of everyday Nigerian retail savings.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-naira-green/20 text-naira-green flex items-center justify-center mb-6">
                <CircleDollarSign size={24} />
              </div>
              <h3 className="font-display font-bold text-lg mb-3">Monnify Sandbox Core</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Each member gets a dedicated virtual account on join. Pay via card, transfer, or local banking options. Confirmations settle instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-naira-gold/20 text-naira-gold flex items-center justify-center mb-6">
                <PhoneCall size={24} />
              </div>
              <h3 className="font-display font-bold text-lg mb-3">Feature Phone USSD Menu</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Members without smartphones can dial <code className="text-naira-gold font-mono bg-white/10 px-1.5 py-0.5 rounded">*384*TRADER#</code> to join, check contribution deadlines, view recipient rotation, and see payout bank details.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-terracotta/20 text-terracotta flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-display font-bold text-lg mb-3">Automated Payout Loop</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Once the cycle's contributions land, the app instantly triggers Monnify payouts to that cycle's designated recipient. Zero delay, zero administrative overhead.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal border-t border-white/5 py-8 text-center text-white/40 text-sm z-10">
        <p>&copy; {new Date().getFullYear()} AjoCircles. Built for the Hackathon.</p>
      </footer>

      {/* Authentication Modal */}
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 border border-charcoal/5 shadow-2xl relative">
            <button
              onClick={() => {
                setError("");
                setAuthModal({ isOpen: false, mode: "login" });
              }}
              className="absolute top-6 right-6 text-charcoal/40 hover:text-charcoal transition text-xl cursor-pointer"
            >
              &times;
            </button>

            {/* Tabs */}
            <div className="flex border-b border-charcoal/5 mb-6">
              <button
                onClick={() => {
                  setError("");
                  setAuthModal({ isOpen: true, mode: "login" });
                }}
                className={`flex-1 pb-3 text-center font-display font-bold text-lg transition border-b-2 cursor-pointer ${
                  authModal.mode === "login" 
                    ? "border-naira-green text-naira-green" 
                    : "border-transparent text-charcoal/40"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setError("");
                  setAuthModal({ isOpen: true, mode: "register" });
                }}
                className={`flex-1 pb-3 text-center font-display font-bold text-lg transition border-b-2 cursor-pointer ${
                  authModal.mode === "register" 
                    ? "border-naira-green text-naira-green" 
                    : "border-transparent text-charcoal/40"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-terracotta/10 border border-terracotta/20 text-terracotta text-sm font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authModal.mode === "register" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Chinedu Obi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-warm-linen/50 focus-ring font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-warm-linen/50 focus-ring font-medium"
                />
              </div>

              {authModal.mode === "register" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="chinedu@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-warm-linen/50 focus-ring font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">4-Digit Security PIN</label>
                <input
                  type="password"
                  required
                  pattern="[0-9]{4,6}"
                  placeholder="••••"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-warm-linen/50 focus-ring text-center tracking-widest font-mono text-xl"
                />
              </div>

              {authModal.mode === "register" && (
                <div className="border-t border-charcoal/5 pt-4 mt-2 space-y-4">
                  <div className="flex items-center gap-1.5 text-naira-green">
                    <Landmark size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Disbursement Bank details</span>
                  </div>
                  <p className="text-[11px] text-charcoal/60 leading-relaxed">
                    This is your personal bank account. This is where your lump sum payouts will be sent automatically.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-charcoal/60 mb-1">Bank Name</label>
                      <select
                        value={bankCode}
                        onChange={handleBankChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-charcoal/10 bg-warm-linen/50 focus-ring font-semibold"
                      >
                        {bankList.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-charcoal/60 mb-1">Account Number</label>
                      <input
                        type="text"
                        required
                        pattern="[0-9]{10}"
                        placeholder="1029384756"
                        maxLength={10}
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-charcoal/10 bg-warm-linen/50 focus-ring font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition shadow-lg shadow-naira-green/20 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {submitting ? "Processing..." : authModal.mode === "login" ? "Sign In" : "Register"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
