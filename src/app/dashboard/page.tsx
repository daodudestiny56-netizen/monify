"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Users, 
  Landmark, 
  Wallet, 
  LogOut, 
  Copy, 
  Check, 
  Play, 
  Phone,
  Layers,
  ArrowRight
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [circles, setCircles] = useState<any[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [circleDetail, setCircleDetail] = useState<any>(null);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCryptoOpen, setIsCryptoOpen] = useState(false);
  
  const [createName, setCreateName] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createFrequency, setCreateFrequency] = useState("WEEKLY");
  const [createMembers, setCreateMembers] = useState("4");
  const [createOrderType, setCreateOrderType] = useState("FIXED");
  
  const [joinCode, setJoinCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const data = await res.json();
        setUser(data.user);

        const circlesRes = await fetch("/api/circles");
        if (circlesRes.ok) {
          const circlesData = await circlesRes.json();
          setCircles(circlesData.circles || []);
          if (circlesData.circles && circlesData.circles.length > 0) {
            setSelectedCircleId(circlesData.circles[0].id);
          }
        }
      } catch (err) {
        console.error("Dashboard init error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const fetchCircleDetails = useCallback(async () => {
    if (!selectedCircleId) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/circles/${selectedCircleId}`);
      if (res.ok) {
        const data = await res.json();
        setCircleDetail(data);
      }
    } catch (err) {
      console.error("Error fetching circle details:", err);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedCircleId]);

  useEffect(() => {
    fetchCircleDetails();
    
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(fetchCircleDetails, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedCircleId, fetchCircleDetails]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormSubmitting(true);

    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          contributionAmount: createAmount,
          frequency: createFrequency,
          memberCount: createMembers,
          payoutOrderType: createOrderType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create circle");
      }

      setCircles((prev) => [...prev, data.circle]);
      setSelectedCircleId(data.circle.id);
      setIsCreateOpen(false);
      
      setCreateName("");
      setCreateAmount("");
      setCreateFrequency("WEEKLY");
      setCreateMembers("4");
      setCreateOrderType("FIXED");
    } catch (err: any) {
      setError(err.message || "Failed to create circle");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormSubmitting(true);

    try {
      const res = await fetch("/api/circles/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join circle");
      }

      const circlesRes = await fetch("/api/circles");
      if (circlesRes.ok) {
        const circlesData = await circlesRes.json();
        setCircles(circlesData.circles || []);
      }
      
      setSelectedCircleId(data.circleId);
      setIsJoinOpen(false);
      setJoinCode("");
    } catch (err: any) {
      setError(err.message || "Failed to join circle");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleManualOverride = async (memberId: string, cycleNumber: number) => {
    try {
      const res = await fetch(`/api/circles/${selectedCircleId}/manual-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, cycleNumber }),
      });

      if (res.ok) {
        const detailsRes = await fetch(`/api/circles/${selectedCircleId}`);
        if (detailsRes.ok) {
          const data = await detailsRes.json();
          setCircleDetail(data);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "Override failed");
      }
    } catch (err) {
      console.error("Override error:", err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const triggerMockPaymentWebhook = async (memberAccountNumber: string, amount: number) => {
    try {
      const res = await fetch("/api/webhooks/monnify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "monnify-signature": "mock_valid_signature_for_sandbox"
        },
        body: JSON.stringify({
          eventType: "SUCCESSFUL_TRANSACTION",
          eventData: {
            transactionReference: `mock_webhook_${Date.now()}`,
            amountPaid: amount,
            destinationAccountPaymentInformation: {
              accountNumber: memberAccountNumber
            }
          }
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Payment Success Webhook simulation fired!");
        if (selectedCircleId) {
          const detailRes = await fetch(`/api/circles/${selectedCircleId}`);
          if (detailRes.ok) {
            setCircleDetail(await detailRes.json());
          }
        }
      } else {
        alert("Webhook fail: " + data.error);
      }
    } catch (err) {
      console.error("Mock webhook error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-warm-linen">
        <div className="w-12 h-12 rounded-full border-4 border-naira-green border-t-transparent animate-spin"></div>
        <p className="mt-4 font-display font-medium text-charcoal">Loading your profile...</p>
      </div>
    );
  }

  const renderPayoutWheel = () => {
    if (!circleDetail || !circleDetail.members || circleDetail.members.length === 0) return null;

    const members = circleDetail.members;
    const n = members.length;
    const width = 320;
    const height = 320;
    const cx = width / 2;
    const cy = height / 2;
    const r = 100;

    const currentRecipientId = circleDetail.circle.currentRecipientId;
    const activeContributions = circleDetail.currentCycleContributions || [];
    const paidCount = activeContributions.filter((c: any) => c.status === "PAID").length;
    const totalAmount = circleDetail.circle.contributionAmount * circleDetail.circle.memberCount;
    const paidAmount = circleDetail.circle.contributionAmount * paidCount;
    
    const progressPercentage = (paidCount / n) * 100;
    const circumference = 2 * Math.PI * r;
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center select-none">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.08" />
            </filter>
            <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FAF2E5" />
              <stop offset="100%" stopColor="#F4D9A7" />
            </linearGradient>
          </defs>

          <circle 
            cx={cx} 
            cy={cy} 
            r={r} 
            fill="none" 
            stroke="rgba(28, 30, 33, 0.05)" 
            strokeWidth="8"
          />

          <circle 
            cx={cx} 
            cy={cy} 
            r={r} 
            fill="none" 
            stroke="var(--naira-green)" 
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="wheel-rotate-transition"
            transform={`rotate(-90 ${cx} ${cy})`}
          />

          {members.map((m: any, i: number) => {
            const nextIdx = (i + 1) % n;
            const theta1 = (2 * Math.PI * i) / n - Math.PI / 2;
            const theta2 = (2 * Math.PI * nextIdx) / n - Math.PI / 2;
            
            const x1 = cx + r * Math.cos(theta1);
            const y1 = cy + r * Math.sin(theta1);
            const x2 = cx + r * Math.cos(theta2);
            const y2 = cy + r * Math.sin(theta2);

            return (
              <line
                key={`line-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(28, 30, 33, 0.1)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {members.map((m: any, i: number) => {
            const theta = (2 * Math.PI * i) / n - Math.PI / 2;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            
            const memberContribution = activeContributions.find((c: any) => c.memberId === m.id);
            const hasPaid = memberContribution?.status === "PAID";
            const isRecipient = m.id === currentRecipientId;

            const initials = m.user.name
              .split(" ")
              .map((word: string) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <g key={`node-${m.id}`} filter="url(#shadow)" className="cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r="24"
                  fill={isRecipient ? "var(--naira-gold)" : hasPaid ? "var(--naira-green)" : "white"}
                  stroke={isRecipient ? "white" : hasPaid ? "var(--naira-green-light)" : "rgba(28, 30, 33, 0.1)"}
                  strokeWidth={isRecipient ? "3" : "2"}
                />
                
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill={isRecipient || hasPaid ? "white" : "var(--charcoal)"}
                  className="font-display font-bold text-xs"
                >
                  {initials}
                </text>

                {isRecipient && (
                  <circle
                    cx={x}
                    cy={y}
                    r="28"
                    fill="none"
                    stroke="var(--naira-gold)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="animate-[spin_8s_linear_infinite]"
                  />
                )}
                
                <text
                  x={x}
                  y={y + (y > cy ? 38 : -32)}
                  textAnchor="middle"
                  fill="var(--charcoal)"
                  className="font-sans font-semibold text-[10px] bg-white px-1 py-0.5 rounded shadow-sm opacity-90"
                >
                  {m.user.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
          <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Active Cycle Pot</span>
          <div className="font-display font-extrabold text-2xl text-naira-green mt-0.5">
            ₦{paidAmount.toLocaleString()}
          </div>
          <div className="h-px w-8 bg-charcoal/10 my-1"></div>
          <span className="text-[10px] font-medium text-charcoal/60 leading-tight">
            Target: ₦{totalAmount.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-naira-green mt-1 bg-naira-green-light px-2 py-0.5 rounded-full">
            {paidCount} of {n} Paid
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-screen bg-warm-linen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-naira-green/5 blur-[120px] animate-blob-1" />
        <div className="absolute bottom-[10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-naira-gold/5 blur-[140px] animate-blob-2" />
        <div className="absolute top-[40%] left-[50%] w-[450px] h-[450px] rounded-full bg-terracotta/5 blur-[130px] animate-blob-3" />
      </div>

      <div className="grain-overlay" />

      <aside className="w-full md:w-64 border-r border-charcoal/5 flex flex-col justify-between p-6 bg-white/35 backdrop-blur-xl z-20">
        <div>
          <div className="flex items-center gap-2 mb-8 transition-transform duration-300 hover:scale-[1.02]">
            <div className="w-8 h-8 rounded-lg bg-naira-green flex items-center justify-center text-white shadow-md shadow-naira-green/10">
              <span className="font-display font-extrabold text-sm">₦</span>
            </div>
            <span className="font-display font-bold text-md text-charcoal">Ajo<span className="text-naira-green">Circles</span></span>
          </div>

          <div className="bg-white/40 backdrop-blur-md rounded-2xl p-4 border border-white/50 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-naira-green text-white font-display font-bold flex items-center justify-center shadow-sm">
                {user?.name?.[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-charcoal truncate">{user?.name}</h4>
                <p className="text-[10px] text-charcoal/60 truncate font-mono font-bold">{user?.phone}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-charcoal/40 uppercase tracking-widest">My Circles</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setIsJoinOpen(true)}
                title="Join Circle"
                className="w-6.5 h-6.5 rounded-lg bg-naira-green-light text-naira-green flex items-center justify-center hover:bg-naira-green/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-naira-green/5"
              >
                <Users size={12} />
              </button>
              <button 
                onClick={() => setIsCreateOpen(true)}
                title="Create Circle"
                className="w-6.5 h-6.5 rounded-lg bg-naira-green text-white flex items-center justify-center hover:bg-naira-green/90 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-naira-green/10"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {circles.length === 0 ? (
              <p className="text-xs text-charcoal/40 italic text-center py-4">No circles joined yet.</p>
            ) : (
              circles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCircleId(c.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between cursor-pointer hover:scale-[1.01] ${
                    selectedCircleId === c.id
                      ? "bg-white/90 border-white/90 text-naira-green font-bold shadow-md shadow-naira-green/[0.03]"
                      : "bg-transparent border-transparent hover:bg-white/30 text-charcoal/70"
                  }`}
                >
                  <span className="text-xs truncate mr-2">{c.name}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    c.status === "ACTIVE" 
                      ? "bg-naira-green/10 text-naira-green border border-naira-green/5" 
                      : "bg-charcoal/10 text-charcoal"
                  }`}>
                    ₦{(c.contributionAmount / 1000).toFixed(0)}k
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="mt-8 border-t border-charcoal/5 pt-4">
            <button
              onClick={() => router.push("/ussd-simulator")}
              className="w-full py-2.5 px-4 rounded-xl bg-naira-green-light hover:bg-naira-green text-naira-green hover:text-white border border-naira-green/5 font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <Phone size={14} /> USSD Simulator
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-6 py-2.5 rounded-xl border border-charcoal/5 text-xs font-semibold text-charcoal/60 hover:text-terracotta hover:bg-terracotta/5 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
        >
          <LogOut size={14} /> Log Out
        </button>
      </aside>

      <main className="flex-1 flex flex-col p-6 md:p-8 z-20 overflow-y-auto">
        {detailLoading && !circleDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-naira-green border-t-transparent animate-spin"></div>
            <p className="mt-4 text-xs font-semibold text-charcoal/60">Loading circle...</p>
          </div>
        ) : !circleDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-white/70 text-naira-green flex items-center justify-center mb-6 shadow-md border border-white/60">
              <Layers size={32} />
            </div>
            <h3 className="font-display font-extrabold text-xl mb-3 text-charcoal">Get Started</h3>
            <p className="text-xs text-charcoal/60 leading-relaxed mb-6">
              Create a savings circle to invite friends, or enter an invite code to join an existing group rotation.
            </p>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setIsJoinOpen(true)}
                className="flex-1 py-3 bg-white/60 backdrop-blur-md text-charcoal border border-charcoal/10 font-bold rounded-xl text-xs hover:bg-white hover:scale-[1.02] transition-all cursor-pointer"
              >
                Join with Code
              </button>
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="flex-1 py-3 bg-naira-green text-white font-bold rounded-xl text-xs hover:bg-naira-green/90 hover:scale-[1.02] transition-all shadow-md shadow-naira-green/10 cursor-pointer"
              >
                Create Circle
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-charcoal/5 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-naira-green bg-naira-green-light px-2.5 py-0.5 rounded-full border border-naira-green/10 tabular-numbers">
                    Cycle {circleDetail.circle.currentCycleNumber} of {circleDetail.circle.memberCount}
                  </span>
                  <span className="text-xs font-semibold text-charcoal/40">•</span>
                  <span className="text-xs font-semibold text-charcoal/60 capitalize">{circleDetail.circle.frequency.toLowerCase()} rotation</span>
                </div>
                <h2 className="font-display font-extrabold text-2xl text-charcoal">{circleDetail.circle.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="glass-card rounded-2xl p-3 shadow-md border border-white/60 flex items-center gap-3 transition-all hover:scale-[1.01]">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-charcoal/40 uppercase block leading-none mb-1">Invite Code</span>
                    <span className="font-mono font-bold text-xs tracking-wider text-charcoal">{circleDetail.circle.inviteCode}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(circleDetail.circle.inviteCode, "code")}
                    className="w-8 h-8 rounded-lg bg-white/40 hover:bg-white/80 transition flex items-center justify-center cursor-pointer shadow-sm border border-white/50"
                  >
                    {copiedText === "code" ? <Check size={14} className="text-naira-green" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 glass-card rounded-3xl p-6 shadow-md border border-white/50 flex flex-col items-center transition-all hover:shadow-lg">
                <div className="w-full flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-sm text-charcoal">Payout Rotation</h3>
                  <span className="text-[11px] font-medium text-charcoal/50">Next payout recipient: <strong className="text-naira-gold font-bold">
                    {circleDetail.members.find((m: any) => m.id === circleDetail.circle.currentRecipientId)?.user.name || "None"}
                  </strong></span>
                </div>
                {renderPayoutWheel()}
              </div>

              <div className="lg:col-span-5 space-y-6">
                {circleDetail.myMemberId && (
                  <div className="bg-gradient-to-br from-charcoal/95 to-[#1c1f24] backdrop-blur-xl rounded-3xl p-6 text-white shadow-xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-[-40px] right-[-40px] w-24 h-24 rounded-full bg-white/5 filter blur-md"></div>
                    <div className="flex items-center gap-2 mb-6">
                      <Landmark size={18} className="text-naira-gold animate-[pulse_3s_infinite]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">My Virtual Reserved Account</span>
                    </div>

                    {(() => {
                      const myMember = circleDetail.members.find((m: any) => m.id === circleDetail.myMemberId);
                      if (!myMember?.monnifyReservedAccountNumber) {
                        return (
                          <div className="space-y-2">
                            <p className="text-xs text-white/60">Reserved account not provisioned yet.</p>
                            <button
                              onClick={async () => {
                                await fetchCircleDetails();
                              }}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded text-[10px] font-semibold transition"
                            >
                              Retry Creation
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Reserved Bank Name</span>
                            <h4 className="font-display font-semibold text-sm">{myMember.monnifyBankName}</h4>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-3.5">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Virtual Account Number</span>
                              <h3 className="font-mono font-extrabold text-xl tracking-widest text-naira-gold tabular-numbers">{myMember.monnifyReservedAccountNumber}</h3>
                            </div>
                            <button
                              onClick={() => copyToClipboard(myMember.monnifyReservedAccountNumber, "account")}
                              className="w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/5"
                            >
                              {copiedText === "account" ? <Check size={14} className="text-naira-green" /> : <Copy size={14} />}
                            </button>
                          </div>

                          <div className="border-t border-white/5 pt-3.5">
                            <p className="text-[11px] text-white/50 leading-relaxed tabular-numbers">
                              Transfer <strong className="text-white font-bold">₦{circleDetail.circle.contributionAmount.toLocaleString()}</strong> to this account to mark yourself paid for Cycle {circleDetail.circle.currentCycleNumber}. Acceptable channels include Bank App Transfer and USSD.
                            </p>
                          </div>
                          
                          <div className="border-t border-white/5 pt-3.5 flex gap-2">
                            <button
                              onClick={() => triggerMockPaymentWebhook(myMember.monnifyReservedAccountNumber, circleDetail.circle.contributionAmount)}
                              className="flex-1 py-2 bg-naira-green text-white rounded-lg text-[9px] font-bold hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-naira-green/10"
                            >
                              <Play size={10} /> Simulate Webhook Payment
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <button
                  onClick={() => setIsCryptoOpen(true)}
                  className="w-full p-4 rounded-2xl glass-card border border-white/50 shadow-md hover:border-naira-green/30 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-naira-gold-light text-naira-gold flex items-center justify-center border border-naira-gold/10">
                      <Wallet size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal">Pay via Stablecoin</h4>
                      <p className="text-[10px] text-charcoal/50">Diaspora stablecoin top-up <span className="text-naira-green font-semibold">(Teaser)</span></p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-charcoal/40" />
                </button>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 border border-white/50 shadow-md transition-all hover:shadow-lg">
              <h3 className="font-display font-bold text-sm mb-4 text-charcoal">Circle Members Payment Status</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/5 text-charcoal/40 uppercase font-bold text-[10px] tracking-wider">
                      <th className="pb-3 font-semibold">Position</th>
                      <th className="pb-3 font-semibold">Name</th>
                      <th className="pb-3 font-semibold">Phone</th>
                      <th className="pb-3 font-semibold">Status (Cycle {circleDetail.circle.currentCycleNumber})</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/[0.03]">
                    {circleDetail.members.map((m: any, idx: number) => {
                      const contribution = circleDetail.currentCycleContributions.find(
                        (c: any) => c.memberId === m.id
                      );
                      const isPaid = contribution?.status === "PAID";
                      const isCurrentUser = m.userId === user?.id;
                      const isCircleAdmin = circleDetail.circle.adminUserId === user?.id;
                      const isRecipient = m.id === circleDetail.circle.currentRecipientId;

                      return (
                        <tr key={m.id} className="hover:bg-naira-green/[0.02] transition-colors duration-150">
                          <td className="py-3.5 font-display font-extrabold text-charcoal/50">#{idx + 1}</td>
                          <td className="py-3.5 font-semibold text-charcoal">
                            <span className="flex items-center gap-1.5">
                              {m.user.name} 
                              {isCurrentUser && <span className="text-[9px] bg-charcoal/10 text-charcoal px-1.5 py-0.25 rounded-md font-medium">You</span>}
                              {isRecipient && <span className="text-[9px] bg-naira-gold-light text-naira-gold border border-naira-gold/15 px-1.5 py-0.25 rounded-md font-bold animate-[pulse_2s_infinite]">Recipient</span>}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-charcoal/60 font-semibold">{m.user.phone}</td>
                          <td className="py-3.5">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-naira-green bg-naira-green-light px-2.5 py-0.5 rounded-full border border-naira-green/10">
                                <Check size={10} /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-terracotta bg-terracotta-light px-2.5 py-0.5 rounded-full border border-terracotta/10 animate-pulse">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-right">
                            {isCircleAdmin && !isPaid && circleDetail.circle.status === "ACTIVE" && (
                              <button
                                onClick={() => handleManualOverride(m.id, circleDetail.circle.currentCycleNumber)}
                                className="px-3 py-1.5 bg-naira-green-light hover:bg-naira-green/20 text-naira-green border border-naira-green/10 rounded-lg text-[10px] font-bold transition-all hover:scale-[1.02] cursor-pointer"
                              >
                                Mark as Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl w-full max-w-md p-8 border border-white/60 shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-6 right-6 text-charcoal/40 hover:text-charcoal transition-colors duration-200 text-xl cursor-pointer w-8 h-8 rounded-full bg-charcoal/5 flex items-center justify-center hover:bg-charcoal/10"
            >
              &times;
            </button>
            <h3 className="font-display font-extrabold text-xl text-charcoal mb-4">Create savings circle</h3>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-terracotta/10 border border-terracotta/20 text-terracotta text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCircle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Circle Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alaba Traders"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-medium focus:bg-white focus:border-naira-green/35 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Contribution Amount (₦)</label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-bold focus:bg-white focus:border-naira-green/35 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Members Count</label>
                  <input
                    type="number"
                    required
                    min={2}
                    max={12}
                    placeholder="4"
                    value={createMembers}
                    onChange={(e) => setCreateMembers(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-medium focus:bg-white focus:border-naira-green/35 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Frequency</label>
                  <select
                    value={createFrequency}
                    onChange={(e) => setCreateFrequency(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-semibold focus:bg-white transition-all"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Payout Order</label>
                  <select
                    value={createOrderType}
                    onChange={(e) => setCreateOrderType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-semibold focus:bg-white transition-all"
                  >
                    <option value="FIXED">Join order (Fixed)</option>
                    <option value="RANDOM">Random shuffle</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.01] shadow-lg shadow-naira-green/20 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {formSubmitting ? "Creating..." : "Create Circle & Virtual Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isJoinOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl w-full max-w-md p-8 border border-white/60 shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => setIsJoinOpen(false)}
              className="absolute top-6 right-6 text-charcoal/40 hover:text-charcoal transition-colors duration-200 text-xl cursor-pointer w-8 h-8 rounded-full bg-charcoal/5 flex items-center justify-center hover:bg-charcoal/10"
            >
              &times;
            </button>
            <h3 className="font-display font-extrabold text-xl text-charcoal mb-4">Join active circle</h3>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-terracotta/10 border border-terracotta/20 text-terracotta text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleJoinCircle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">Circle Invite Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRADER"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/50 focus-ring font-mono font-bold tracking-widest text-center text-lg focus:bg-white focus:border-naira-green/35 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-4 bg-naira-green text-white font-bold rounded-xl hover:bg-naira-green/90 transition-all duration-300 hover:scale-[1.01] shadow-lg shadow-naira-green/20 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {formSubmitting ? "Joining..." : "Join & Provision Virtual Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isCryptoOpen && (
        <div className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl w-full max-w-md p-8 border border-white/60 shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => setIsCryptoOpen(false)}
              className="absolute top-6 right-6 text-charcoal/40 hover:text-charcoal transition-colors duration-200 text-xl cursor-pointer w-8 h-8 rounded-full bg-charcoal/5 flex items-center justify-center hover:bg-charcoal/10"
            >
              &times;
            </button>
            <div className="w-12 h-12 rounded-2xl bg-naira-gold-light text-naira-gold flex items-center justify-center mb-6 border border-naira-gold/15 shadow-sm">
              <Wallet size={24} />
            </div>
            <h3 className="font-display font-extrabold text-xl text-charcoal mb-3">Stablecoin Pay (Coming Soon)</h3>
            <p className="text-xs text-charcoal/70 leading-relaxed mb-6">
              Soon, Diaspora members will be able to top-up savings circles directly using stablecoins (USDT/USDC). High transaction speeds, extremely low cross-border fees, and automated conversion to local currency settled straight to your Naira virtual account.
            </p>
            <button
              onClick={() => setIsCryptoOpen(false)}
              className="w-full py-3 bg-charcoal text-white font-bold rounded-xl text-xs hover:bg-charcoal/95 hover:scale-[1.01] transition-all cursor-pointer shadow-md"
            >
              Cool, got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
