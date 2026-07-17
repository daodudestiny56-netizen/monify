"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowLeft, Landmark, Hash, HelpCircle } from "lucide-react";

export default function UssdSimulatorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [simUsers, setSimUsers] = useState<any[]>([]);
  const [selectedSimUser, setSelectedSimUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [ussdSessionText, setUssdSessionText] = useState("");
  const [ussdScreenText, setUssdScreenText] = useState("");
  const [ussdInput, setUssdInput] = useState("");
  const [isUssdActive, setIsUssdActive] = useState(false);
  const [isUssdEnding, setIsUssdEnding] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const userData = await res.json();
        setUser(userData.user);

        const circlesRes = await fetch("/api/circles");
        if (circlesRes.ok) {
          const circlesData = await circlesRes.json();
          const circlesList = circlesData.circles || [];

          const allUsersMap = new Map<string, any>();
          
          allUsersMap.set(userData.user.id, {
            id: userData.user.id,
            name: `${userData.user.name} (You)`,
            phone: userData.user.phone
          });

          for (const c of circlesList) {
            try {
              const detailRes = await fetch(`/api/circles/${c.id}`);
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                if (detailData.members) {
                  for (const m of detailData.members) {
                    if (m.user) {
                      allUsersMap.set(m.user.id, {
                        id: m.user.id,
                        name: m.user.name,
                        phone: m.user.phone
                      });
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Error fetching detail for circle:", c.id, err);
            }
          }

          const mergedUsers = Array.from(allUsersMap.values());
          setSimUsers(mergedUsers);
          
          const defaultSim = mergedUsers.find((u) => u.id === userData.user.id) || mergedUsers[0];
          setSelectedSimUser(defaultSim);
        }
      } catch (err) {
        console.error("USSD Simulator init error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleUssdDial = async () => {
    if (!selectedSimUser) return;
    setUssdSessionText("");
    setIsUssdActive(true);
    setIsUssdEnding(false);
    setUssdScreenText("Connecting to gateway...");

    try {
      const res = await fetch("/api/ussd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `sim_${Date.now()}`,
          serviceCode: "*384*30#",
          phoneNumber: selectedSimUser.phone,
          text: "",
        }),
      });

      const text = await res.text();
      processUssdResponse(text);
    } catch (err) {
      console.error("USSD call failed:", err);
      setUssdScreenText("END Connection error.");
      setIsUssdEnding(true);
    }
  };

  const handleUssdSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isUssdActive || isUssdEnding || !selectedSimUser) return;

    const nextSessionText = ussdSessionText === "" ? ussdInput : `${ussdSessionText}*${ussdInput}`;
    setUssdSessionText(nextSessionText);
    setUssdInput("");
    setUssdScreenText("Sending request...");

    try {
      const res = await fetch("/api/ussd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `sim_${Date.now()}`,
          serviceCode: "*384*30#",
          phoneNumber: selectedSimUser.phone,
          text: nextSessionText,
        }),
      });

      const text = await res.text();
      processUssdResponse(text);
    } catch (err) {
      console.error("USSD submit failed:", err);
      setUssdScreenText("END Connection error.");
      setIsUssdEnding(true);
    }
  };

  const processUssdResponse = (raw: string) => {
    if (raw.startsWith("CON ")) {
      setUssdScreenText(raw.substring(4));
      setIsUssdEnding(false);
    } else if (raw.startsWith("END ")) {
      setUssdScreenText(raw.substring(4));
      setIsUssdEnding(true);
    } else {
      setUssdScreenText(raw);
      setIsUssdEnding(true);
    }
  };

  const handleUssdKeypress = (key: string) => {
    if (!isUssdActive) {
      if (key === "SEND") handleUssdDial();
      return;
    }
    if (isUssdEnding) {
      if (key === "CLEAR") {
        setIsUssdActive(false);
        setUssdSessionText("");
        setUssdScreenText("");
      }
      return;
    }

    if (key === "SEND") {
      handleUssdSubmit();
    } else if (key === "CLEAR") {
      setUssdInput("");
    } else if (key === "BACK") {
      setUssdInput((p) => p.slice(0, -1));
    } else {
      setUssdInput((p) => p + key);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-wave-light">
        <div className="w-12 h-12 rounded-full border-4 border-naira-green border-t-transparent animate-spin"></div>
        <p className="mt-4 font-display font-medium text-charcoal">Loading USSD Gateway...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col relative overflow-hidden bg-wave-light min-h-screen">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-naira-green/5 blur-[120px] animate-blob-1" />
        <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-naira-gold/5 blur-[140px] animate-blob-2" />
        <div className="absolute top-[40%] left-[50%] w-[450px] h-[450px] rounded-full bg-terracotta/5 blur-[130px] animate-blob-3" />
      </div>

      <div className="grain-overlay" />

      <header className="sticky top-4 max-w-7xl mx-auto w-[calc(100%-2rem)] px-6 py-4 flex items-center justify-between z-50 glass-card rounded-2xl my-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-xs font-bold text-charcoal/60 hover:text-naira-green hover:scale-[1.02] transition-all cursor-pointer mr-2 py-1 px-2.5 rounded-lg bg-charcoal/5 hover:bg-naira-green-light"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <span className="text-xs font-semibold text-charcoal/40">|</span>
          <span className="font-display font-bold text-sm text-charcoal flex items-center gap-1.5 ml-2">
            <Phone size={14} className="text-naira-green" /> USSD Phone Emulator
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-naira-green flex items-center justify-center text-white shadow-md shadow-naira-green/10">
            <span className="font-display font-extrabold text-xs">₦</span>
          </div>
          <span className="font-display font-bold text-sm text-charcoal">Ajo<span className="text-naira-green">Circles</span></span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-8 md:py-16 flex-grow flex flex-col md:flex-row items-center justify-between gap-12 z-10">
        <div className="flex-1 space-y-6 max-w-lg">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-naira-green-light text-naira-green font-display font-semibold text-xs mb-4 border border-naira-green/10 shadow-sm">
              Communal Savings Offline Gateways
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight text-charcoal">
              Simulate USSD Offline Transactions
            </h1>
            <p className="text-sm text-charcoal/70 leading-relaxed mt-3">
              Communal rotating savings (Ajo/Esusu) are often managed offline. Use this interactive emulator to simulate member sessions over features phones. Dial codes, check positions, verify virtual bank details, and simulate actions.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/50 shadow-md">
            <h3 className="font-display font-bold text-xs text-charcoal mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <HelpCircle size={14} className="text-naira-gold" /> Dialing Code Guide
            </h3>
            <ul className="text-xs text-charcoal/80 space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <span className="font-bold text-naira-green font-mono bg-naira-green-light px-1.5 py-0.5 rounded leading-none">*384*30#</span>
                <span>The official gateway number for AjoCircles.</span>
              </li>
              <li className="flex items-start gap-2 border-t border-charcoal/5 pt-2">
                <span className="font-bold text-charcoal/50">Option 1:</span>
                <span>Join a Circle (requires invite code & user PIN confirmation).</span>
              </li>
              <li className="flex items-start gap-2 border-t border-charcoal/5 pt-2">
                <span className="font-bold text-charcoal/50">Option 2:</span>
                <span>Check My Status (checks if you are paid or pending this cycle).</span>
              </li>
              <li className="flex items-start gap-2 border-t border-charcoal/5 pt-2">
                <span className="font-bold text-charcoal/50">Option 3:</span>
                <span>My Circles (displays list of circles you belong to).</span>
              </li>
              <li className="flex items-start gap-2 border-t border-charcoal/5 pt-2">
                <span className="font-bold text-charcoal/50">Option 4:</span>
                <span>Pay Now (shows your virtual reserved account number for transfer).</span>
              </li>
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/50 shadow-md">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-charcoal/60 mb-2">Simulate Active User phone number</label>
            <select
              value={selectedSimUser?.id || ""}
              onChange={(e) => {
                const selected = simUsers.find((u) => u.id === e.target.value);
                if (selected) {
                  setSelectedSimUser(selected);
                  setIsUssdActive(false);
                  setUssdSessionText("");
                  setUssdScreenText("");
                }
              }}
              className="w-full px-4 py-3 text-xs rounded-xl border border-charcoal/10 bg-white/70 focus-ring font-semibold shadow-sm focus:bg-white focus:border-naira-green/35 transition-all cursor-pointer"
            >
              {simUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.phone})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-charcoal/50 leading-relaxed mt-2.5">
              Change the selection to simulate dialing from another circle member's phone (e.g. dial as Chioma to join and configure positions, or Ibrahim to check payment status).
            </p>
          </div>
        </div>

        <div className="flex-1 w-full max-w-[280px] flex justify-center">
          <div className="w-full aspect-[1/2] rounded-[48px] bg-gradient-to-b from-[#2d3035] to-[#121416] p-4.5 shadow-2xl flex flex-col justify-between border-4 border-charcoal/80 relative overflow-hidden group transition-all duration-500 hover:shadow-naira-green/5">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#121416] rounded-full" />

            <div className="flex-grow flex-shrink-0 aspect-[4/3] bg-gradient-to-b from-[#8da08d] to-[#7f917f] rounded-2xl p-4 font-mono text-xs text-[#171b17] relative overflow-hidden flex flex-col justify-between border border-black/25 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] min-h-[160px] mt-2">
              <div className="border-b border-[#1e231e]/20 pb-1 flex justify-between items-center text-[9px] font-bold opacity-80 select-none">
                <span>{selectedSimUser?.name.split(" ")[0] || "SIM"}</span>
                <span className="flex items-center gap-0.5"><Hash size={8} /> 4G</span>
              </div>

              <div className="flex-grow py-3.5 overflow-y-auto leading-tight text-[11px] whitespace-pre-wrap select-text pr-0.5">
                {isUssdActive ? (
                  ussdScreenText
                ) : (
                  <div className="text-center py-6 select-none">
                    <p className="text-[9px] opacity-60 font-bold tracking-wider">DIAL CODE</p>
                    <p className="text-md font-extrabold mt-1.5 tracking-widest text-black">*384*30#</p>
                    <p className="text-[8px] opacity-50 mt-1">Click SEND to dial</p>
                  </div>
                )}
              </div>

              {isUssdActive && !isUssdEnding && (
                <div className="border-t border-[#1e231e]/20 pt-1 flex gap-1 items-center">
                  <span className="opacity-60 font-bold select-none">&gt;</span>
                  <input
                    type="text"
                    value={ussdInput}
                    onChange={(e) => setUssdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUssdSubmit();
                    }}
                    className="flex-grow bg-transparent outline-none border-b border-[#1e231e]/30 font-bold text-black"
                    placeholder="..."
                    autoFocus
                  />
                </div>
              )}

              {isUssdEnding && (
                <div className="text-center pt-1 border-t border-[#1e231e]/20 select-none">
                  <button
                    onClick={() => {
                      setIsUssdActive(false);
                      setUssdSessionText("");
                      setUssdScreenText("");
                    }}
                    className="px-3 py-1 bg-[#171b17]/10 rounded text-[9px] font-bold hover:bg-[#171b17]/20 border border-black/5"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-white flex-grow-0 select-none">
              <button onClick={() => handleUssdKeypress("SEND")} className="py-3 rounded-xl bg-naira-green hover:bg-naira-green/85 hover:scale-105 active:scale-95 text-white font-bold text-[10px] shadow-md border border-naira-green/10 transition-all cursor-pointer">SEND</button>
              <button onClick={() => handleUssdKeypress("CLEAR")} className="py-3 rounded-xl bg-terracotta hover:bg-terracotta/85 hover:scale-105 active:scale-95 text-white font-bold text-[10px] shadow-md border border-terracotta/10 transition-all cursor-pointer">CLEAR</button>
              <button onClick={() => handleUssdKeypress("BACK")} className="py-3 rounded-xl bg-white/10 hover:bg-white/15 hover:scale-105 active:scale-95 text-white/80 font-bold text-[10px] shadow-md border border-white/5 transition-all cursor-pointer">BACK</button>
              
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (isUssdActive && !isUssdEnding) {
                      setUssdInput((p) => p + k);
                    }
                  }}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 font-bold text-xs shadow border border-white/5 active:bg-white/20 transition-all cursor-pointer"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-charcoal/30 text-xs z-10 mt-auto">
        <p>&copy; {new Date().getFullYear()} AjoCircles. Simulated Gateway Node.</p>
      </footer>
    </div>
  );
}
