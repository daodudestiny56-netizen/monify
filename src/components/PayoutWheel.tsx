import React from 'react';

export default function PayoutWheel({ circleDetail }: { circleDetail: any }) {
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
}
