"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CircleDollarSign, ShieldCheck, Activity, ArrowRight, ArrowLeftRight, Landmark, Layers } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "login" | "register" }>({
    isOpen: false,
    mode: "login",
  });

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankCode, setBankCode] = useState("058");
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
    <div className="flex-grow flex flex-col relative overflow-hidden bg-warm-linen min-h-screen">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-naira-green/5 blur-[120px] animate-blob-1" />
        <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-naira-gold/5 blur-[140px] animate-blob-2" />
        <div className="absolute top-[40%] left-[50%] w-[450px] h-[450px] rounded-full bg-terracotta/5 blur-[130px] animate-blob-3" />
      </div>

      <div className="grain-overlay" />

      <header className="sticky top-4 max-w-7xl mx-auto w-[calc(100%-2rem)] px-6 py-4 flex items-center justify-between z-50 glass-card rounded-full my-4">
        <div className="flex items-center gap-3 transition-transform duration-300 hover:scale-105 cursor-pointer">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center mix-blend-multiply">
            <Image src="/logo.png" alt="AjoCircles Logo" width={80} height={80} className="w-full h-full object-cover scale-[1.7]" />
          </div>
          <span className="font-display font-bold text-xl text-charcoal tracking-tight">AjoCircles</span>
        </div>
        
        <nav className="flex items-center gap-4">
          {user ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 bg-naira-green text-white font-semibold rounded-xl hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.02] shadow-md shadow-naira-green/15 flex items-center gap-2 cursor-pointer"
            >
              Go to Dashboard <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => setAuthModal({ isOpen: true, mode: "login" })}
              className="px-6 py-2.5 bg-naira-green text-white font-semibold rounded-full hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.02] shadow-md shadow-naira-green/15 cursor-pointer"
            >
              Get Started
            </button>
          )}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto w-full px-6 py-12 lg:py-20 flex-grow flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
        <div className="flex-grow flex-1 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-naira-green-light/80 text-naira-green font-display font-semibold text-sm mb-6 border border-naira-green/10 animate-fade-in-up shadow-sm" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
            <span className="flex h-2 w-2 rounded-full bg-naira-green animate-pulse"></span>
            Digitizing rotating savings & trust
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-charcoal mb-6 animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            Save, Rotate & Pay Out <span className="text-naira-green underline decoration-naira-gold decoration-4 underline-offset-4">With Trust</span>.
          </h1>
          
          <p className="text-lg text-charcoal/80 leading-relaxed mb-8 animate-fade-in-up" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
            Digitize your traditional rotating savings (Ajo/Esusu). Circle members contribute automatically, while payouts rotate securely via the Monnify API. Anyone can join, pay in, or monitor progress instantly using our built-in **Monnify Sandbox Core**.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
            {user ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto px-8 py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-naira-green/20 flex items-center justify-center gap-2 text-lg cursor-pointer"
              >
                Enter Dashboard <ArrowRight size={20} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setAuthModal({ isOpen: true, mode: "register" })}
                  className="w-full sm:w-auto px-8 py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-naira-green/20 flex items-center justify-center gap-2 text-lg cursor-pointer"
                >
                  Create your first Circle <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => setAuthModal({ isOpen: true, mode: "login" })}
                  className="w-full sm:w-auto px-8 py-4 bg-white/60 backdrop-blur-md text-charcoal border border-charcoal/10 font-bold rounded-xl hover:bg-white/80 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 text-lg cursor-pointer"
                >
                  Join existing Circle
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-grow flex-1 w-full max-w-lg lg:max-w-none flex justify-center animate-fade-in-up" style={{ animationDelay: '550ms', animationFillMode: 'both' }}>
          <div className="relative w-full min-h-[460px] max-w-[420px] rounded-3xl glass-card p-6 sm:p-8 shadow-xl flex flex-col justify-between overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-naira-green/5 group gap-4">
            <div className="absolute inset-0 bg-radial from-naira-green/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-charcoal/5 pb-4 z-10">
              <div>
                <span className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">Ajo Circle</span>
                <h3 className="font-display font-bold text-lg text-charcoal">Ajegunle Traders</h3>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-naira-gold/15 text-naira-gold font-display font-semibold text-sm border border-naira-gold/10">
                Weekly Rotation
              </div>
            </div>

            <div className="flex-grow flex items-center justify-center py-8 relative z-10">
              <div className="w-56 h-56 relative flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0D5C3A" />
                      <stop offset="100%" stopColor="#2BB877" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="rgba(0,0,0,0.04)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="url(#progress-gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="289"
                    strokeDashoffset="72.25"
                    className="wheel-progress-transition"
                  />
                </svg>
                
                {/* Center Content */}
                <div className="text-center z-10 px-4 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest block mb-1">Total Pot</span>
                  <div className="font-display font-black text-3xl text-naira-green tracking-tight tabular-numbers drop-shadow-sm">₦40,000</div>
                  <span className="text-[11px] font-semibold text-charcoal/60 mt-2 bg-charcoal/5 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-naira-green animate-pulse"></span>
                    3 of 4 paid this week
                  </span>
                </div>

                {/* Nodes - Positioned using exact percentages */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-naira-green to-[#156641] text-white font-bold w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-[0_4px_12px_rgba(13,92,58,0.3)] border-2 border-white z-20 hover:scale-110 transition-transform cursor-pointer">CO</div>
                
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-naira-green to-[#156641] text-white font-bold w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-[0_4px_12px_rgba(13,92,58,0.3)] border-2 border-white z-20 hover:scale-110 transition-transform cursor-pointer">FA</div>
                
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-gradient-to-br from-naira-green to-[#156641] text-white font-bold w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-[0_4px_12px_rgba(13,92,58,0.3)] border-2 border-white z-20 hover:scale-110 transition-transform cursor-pointer">IM</div>
                
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-[#FFF8E7] to-[#FFE8B3] border-2 border-white text-naira-gold font-bold w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-[0_0_20px_rgba(229,169,60,0.4)] z-20 hover:scale-110 transition-transform cursor-pointer relative animate-node-pulse">
                  <div className="absolute inset-0 rounded-full border-2 border-naira-gold/50 animate-[ping_2s_ease-out_infinite] opacity-50 scale-150"></div>
                  <span className="relative z-10">CN</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-between z-10 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-naira-green-light flex items-center justify-center text-naira-green group-hover:scale-110 transition-transform">
                  <Landmark size={16} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-charcoal leading-tight mb-0.5">Wema Bank (Reserved)</h4>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-naira-green animate-pulse"></div>
                    <p className="text-[11px] font-mono text-charcoal/50 font-bold tracking-widest">9921029384</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider mb-0.5">Contribution</span>
                <span className="text-xs font-bold text-naira-green bg-naira-green-light/80 px-2.5 py-1 rounded-lg border border-naira-green/10 tabular-numbers">₦10,000</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="bg-[#181a1d] text-white py-20 px-6 relative z-10 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-naira-green/10 blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-terracotta/5 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="max-w-xl mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 text-naira-gold font-display font-semibold text-xs mb-4 border border-white/10">
              FEATURES
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
              Digitized for convenience, built for accessibility.
            </h2>
            <p className="text-white/70 leading-relaxed">
              We bridge the gap between modern digital banking and the realities of everyday communal savings.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card-dark rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] group flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-naira-green/10 text-naira-green flex items-center justify-center mb-6 border border-naira-green/20 group-hover:scale-110 transition-transform duration-300">
                  <CircleDollarSign size={24} />
                </div>
                <h3 className="font-display font-bold text-lg mb-3">Monnify Sandbox Core</h3>
                <p className="text-white/60 leading-relaxed text-sm">
                  Each member gets a dedicated virtual account on join. Pay via card, transfer, or local banking options. Confirmations settle instantly.
                </p>
              </div>
            </div>

            <div className="glass-card-dark rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] group flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-naira-gold/10 text-naira-gold flex items-center justify-center mb-6 border border-naira-gold/20 group-hover:scale-110 transition-transform duration-300">
                  <Activity size={24} />
                </div>
                <h3 className="font-display font-bold text-lg mb-3">Real-time Webhook Events</h3>
                <p className="text-white/60 leading-relaxed text-sm">
                  Instant transaction detection via Monnify Webhooks. As soon as a member completes a transfer, the cycle progress bar updates and confirms payment instantly.
                </p>
              </div>
            </div>

            <div className="glass-card-dark rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] group flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center mb-6 border border-terracotta/20 group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="font-display font-bold text-lg mb-3">Automated Payout Loop</h3>
                <p className="text-white/60 leading-relaxed text-sm">
                  Once the cycle's contributions land, the app instantly triggers Monnify payouts to that cycle's designated recipient. Zero delay, zero administrative overhead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#121416] border-t border-white/5 py-8 text-center text-white/40 text-sm z-10 relative">
        <p>&copy; {new Date().getFullYear()} AjoCircles. Built for the Hackathon.</p>
      </footer>

      {authModal.isOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl w-full max-w-md p-8 border border-white/60 shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => {
                setError("");
                setAuthModal({ isOpen: false, mode: "login" });
              }}
              className="absolute top-6 right-6 text-charcoal/40 hover:text-charcoal transition-colors duration-200 text-xl cursor-pointer w-8 h-8 rounded-full bg-charcoal/5 flex items-center justify-center hover:bg-charcoal/10"
            >
              &times;
            </button>

            <div className="flex border-b border-charcoal/5 mb-6">
              <button
                onClick={() => {
                  setError("");
                  setAuthModal({ isOpen: true, mode: "login" });
                }}
                className={`flex-1 pb-3 text-center font-display font-bold text-lg transition-colors duration-300 border-b-2 cursor-pointer ${
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
                className={`flex-1 pb-3 text-center font-display font-bold text-lg transition-colors duration-300 border-b-2 cursor-pointer ${
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
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-medium focus:bg-white focus:border-naira-green/35 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-medium focus:bg-white focus:border-naira-green/35 transition-all"
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
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-medium focus:bg-white focus:border-naira-green/35 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring text-center tracking-widest font-mono text-xl focus:bg-white focus:border-naira-green/35 transition-all"
                />
              </div>

              {authModal.mode === "register" && (
                <div className="border-t border-charcoal/5 pt-4 mt-2 space-y-4">
                  <div className="flex items-center gap-1.5 text-naira-green">
                    <Landmark size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Disbursement Bank details</span>
                  </div>
                  <p className="text-[11px] text-charcoal/60 leading-relaxed">
                    This is your personal bank account where your lump sum payouts will be automatically credited.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-charcoal/60 mb-1">Bank Name</label>
                      <select
                        value={bankCode}
                        onChange={handleBankChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-semibold focus:bg-white transition-all"
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-mono font-bold focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.01] shadow-lg shadow-naira-green/20 disabled:opacity-50 mt-4 cursor-pointer"
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
