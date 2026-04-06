"use client";

import { Activity, ListTodo, Users, Zap, ChevronRight, Hash, Clock } from "lucide-react";

const sessions = [
  {
    id: "a3f82c1e",
    tasks: 12,
    developer: "Sarah K",
    project: "payments-api",
    duration: "1h 24m",
    tokens: "42.3K",
    initials: "SK",
    color: "bg-[#D97757]/20 text-[#D97757]",
  },
  {
    id: "7b4d9f02",
    tasks: 8,
    developer: "Alex L",
    project: "auth-service",
    duration: "52m",
    tokens: "28.1K",
    initials: "AL",
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    id: "e1c56a89",
    tasks: 15,
    developer: "Ravi P",
    project: "dashboard-ui",
    duration: "2h 10m",
    tokens: "65.8K",
    initials: "RP",
    color: "bg-green-500/20 text-green-400",
  },
];

export function MockDashboard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden my-8">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-px bg-border/30">
        <div className="bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#D97757]/10 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-[#D97757]" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">12</p>
            <p className="text-[11px] text-muted-foreground mt-1">Sessions</p>
          </div>
        </div>
        <div className="bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <ListTodo className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">87</p>
            <p className="text-[11px] text-muted-foreground mt-1">Tasks</p>
          </div>
        </div>
        <div className="bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">5</p>
            <p className="text-[11px] text-muted-foreground mt-1">Active devs</p>
          </div>
        </div>
        <div className="bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">284K</p>
            <p className="text-[11px] text-muted-foreground mt-1">Tokens</p>
          </div>
        </div>
      </div>

      {/* Session list */}
      <div className="border-t border-border/50">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <div>
                <div className="flex items-center gap-2">
                  <Hash className="h-3 w-3 text-muted-foreground/50" />
                  <span className="font-mono text-sm text-muted-foreground">
                    {s.id}...
                  </span>
                  <span className="text-[11px] bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-muted-foreground">
                    {s.tasks} tasks
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/70">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium ${s.color}`}
                  >
                    {s.initials}
                  </div>
                  <span>{s.developer}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{s.project}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground/60">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{s.duration}</span>
              </div>
              <span className="text-blue-400 font-medium text-xs">
                {s.tokens}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
