"use client";

import { useState, useEffect } from "react";

const LINES = [
  { type: "command", text: "$ npm i -g codeusage-cli", delay: 0 },
  { type: "output", text: "added 13 packages in 4.2s", delay: 1200 },
  { type: "blank", text: "", delay: 1600 },
  { type: "command", text: "$ codeusage init", delay: 2000 },
  { type: "blank", text: "", delay: 2400 },
  { type: "output", text: "📊 Codeusage CLI Setup", delay: 2600 },
  { type: "blank", text: "", delay: 2800 },
  { type: "prompt", text: "? Select your AI coding tool:", delay: 3000 },
  { type: "selected", text: "  ❯ Claude Code - Anthropic's AI coding assistant", delay: 3400 },
  { type: "dim", text: "    OpenAI Codex - OpenAI's AI coding CLI", delay: 3400 },
  { type: "blank", text: "", delay: 3800 },
  { type: "spinner", text: "◐ Waiting for browser authentication...", delay: 4200 },
  { type: "success", text: "✔ Connected to workspace: My Team", delay: 5400 },
  { type: "blank", text: "", delay: 5600 },
  { type: "prompt", text: "? Your name/alias: Sarah K", delay: 5800 },
  { type: "prompt", text: "? Hook registration scope: Global (recommended)", delay: 6400 },
  { type: "blank", text: "", delay: 6800 },
  { type: "success", text: "✔ Claude Code hooks registered", delay: 7200 },
  { type: "success", text: "✔ Prompt Guard active (44 patterns)", delay: 7600 },
  { type: "blank", text: "", delay: 7800 },
  { type: "green", text: "✅ Codeusage is ready!", delay: 8000 },
];

export function MockTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    LINES.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(index + 1);
      }, line.delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-xl border border-border/50 bg-[#0a0a0a] overflow-hidden my-8">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Terminal</span>
      </div>

      {/* Content */}
      <div className="p-4 font-mono text-[13px] leading-6 min-h-[320px]">
        {LINES.slice(0, visibleLines).map((line, i) => {
          if (line.type === "blank") return <div key={i} className="h-3" />;

          const colorClass =
            line.type === "command"
              ? "text-foreground"
              : line.type === "output"
                ? "text-muted-foreground"
                : line.type === "prompt"
                  ? "text-cyan-400"
                  : line.type === "selected"
                    ? "text-cyan-300 font-medium"
                    : line.type === "dim"
                      ? "text-muted-foreground/50"
                      : line.type === "spinner"
                        ? "text-yellow-400"
                        : line.type === "success"
                          ? "text-green-400"
                          : line.type === "green"
                            ? "text-green-400 font-medium"
                            : "text-muted-foreground";

          return (
            <div key={i} className={colorClass}>
              {line.type === "command" ? (
                <>
                  <span className="text-[#D97757]">$ </span>
                  <span>{line.text.slice(2)}</span>
                </>
              ) : (
                line.text
              )}
            </div>
          );
        })}
        {visibleLines < LINES.length && (
          <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse" />
        )}
      </div>
    </div>
  );
}
