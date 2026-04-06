"use client";

import { Activity, Users, ListTodo, Zap } from "lucide-react";

const developers = [
  { initials: "SK", name: "Sarah K", project: "payments-api", color: "bg-[#D97757]/20 text-[#D97757]", sessions: 3, tasks: 18, tokens: "24.1K", bars: [6, 10, 16, 12, 8], active: [2, 3] },
  { initials: "AL", name: "Alex L", project: "auth-service", color: "bg-blue-500/20 text-blue-400", sessions: 5, tasks: 32, tokens: "41.8K", bars: [8, 14, 18, 10, 5], active: [1, 2] },
  { initials: "RP", name: "Ravi P", project: "dashboard-ui", color: "bg-green-500/20 text-green-400", sessions: 2, tasks: 12, tokens: "15.3K", bars: [12, 7, 10, 15, 20], active: [0, 3, 4] },
  { initials: "MN", name: "Maya N", project: "mobile-app", color: "bg-purple-500/20 text-purple-400", sessions: 4, tasks: 27, tokens: "35.6K", bars: [10, 18, 14, 20, 9], active: [1, 2, 3] },
];

const chartBars = [20, 35, 25, 50, 40, 65, 80, 90, 70, 55, 45, 60, 85, 95];
const highlightBars = [6, 7, 8, 12, 13];

const projects = [
  { name: "payments-api", tasks: 38, pct: 75 },
  { name: "auth-service", tasks: 27, pct: 55 },
  { name: "dashboard-ui", tasks: 19, pct: 38 },
  { name: "mobile-app", tasks: 14, pct: 28 },
];

export function MockBanner() {
  return (
    <div className="rounded-xl border border-border/50 bg-[#0a0a0a] overflow-hidden my-8 relative">
      {/* Subtle glow */}
      <div className="absolute -top-20 right-20 w-80 h-80 rounded-full bg-[#D97757]/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-20 left-10 w-60 h-60 rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />

      <div className="relative p-6 sm:p-8 space-y-6">
        {/* Dev cards — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {developers.map((dev) => (
            <div
              key={dev.initials}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold ${dev.color}`}>
                  {dev.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white/85">{dev.name}</div>
                  <div className="text-xs text-white/30">{dev.project}</div>
                </div>
                <div className="flex items-end gap-[3px] h-6">
                  {dev.bars.map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-sm ${dev.active.includes(i) ? "bg-[#D97757]" : "bg-[#D97757]/30"}`}
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-white/[0.04] text-[11px] text-white/30">
                <span><span className="text-white/50 font-medium">{dev.sessions}</span> sessions</span>
                <span><span className="text-white/50 font-medium">{dev.tasks}</span> tasks</span>
                <span><span className="text-white/50 font-medium">{dev.tokens}</span> tokens</span>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard panel */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-white/35 uppercase tracking-wider font-medium">Team Activity</span>
            <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Live</span>
          </div>

          <div className="flex gap-6">
            {/* Left — stats + chart */}
            <div className="flex-1">
              {/* Stats */}
              <div className="flex gap-6 mb-5">
                <div>
                  <div className="text-2xl font-bold text-[#D97757]">24</div>
                  <div className="text-[11px] text-white/30">Sessions today</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">142</div>
                  <div className="text-[11px] text-white/30">Tasks this week</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">8</div>
                  <div className="text-[11px] text-white/30">Active devs</div>
                </div>
              </div>

              {/* Chart */}
              <div className="flex items-end gap-1.5 h-20 pt-2 border-t border-white/[0.04]">
                {chartBars.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${highlightBars.includes(i) ? "bg-[#D97757]/50" : "bg-[#D97757]/15"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Right — project list */}
            <div className="flex-1 flex flex-col justify-center">
              {projects.map((p) => (
                <div key={p.name} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-b-0">
                  <span className="text-xs text-white/50 font-mono w-28 truncate">{p.name}</span>
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D97757]/40 rounded-full" style={{ width: `${p.pct}%` }} />
                  </div>
                  <span className="text-[11px] text-white/25 w-14 text-right">{p.tasks} tasks</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
