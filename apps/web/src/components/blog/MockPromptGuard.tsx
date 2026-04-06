"use client";

import { useState, useEffect } from "react";

const PROMPT = "Can you update the database connection to use postgresql://admin:s3cretP@ss@prod-db.internal:5432/myapp";
const TYPING_SPEED = 25;

export function MockPromptGuard() {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "enter" | "blocked">("typing");

  useEffect(() => {
    let charIndex = 0;
    let timer: NodeJS.Timeout;

    function typeNext() {
      if (charIndex < PROMPT.length) {
        charIndex++;
        setTyped(PROMPT.slice(0, charIndex));
        timer = setTimeout(typeNext, TYPING_SPEED);
      } else {
        // Done typing — brief pause then "press enter"
        timer = setTimeout(() => {
          setPhase("enter");
          // Show block after a beat
          timer = setTimeout(() => {
            setPhase("blocked");
          }, 600);
        }, 500);
      }
    }

    timer = setTimeout(typeNext, 1000);
    return () => clearTimeout(timer);
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

      <div className="p-5 font-mono text-[13px] leading-6 min-h-[200px]">
        {/* User prompt line */}
        <div className="flex gap-2">
          <span className="text-[#D97757] shrink-0">&gt;</span>
          <span className="text-foreground/80">
            {typed}
            {phase === "typing" && (
              <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5 align-middle" />
            )}
          </span>
        </div>

        {/* Block message */}
        {phase === "blocked" && (
          <div className="mt-4 space-y-1.5 animate-in fade-in duration-200">
            <div className="text-muted-foreground/30 text-xs mb-3">
              UserPromptSubmit operation blocked by hook:
            </div>
            <div className="text-yellow-400">
              ⚠  Codeusage blocked your message
            </div>
            <div className="h-2" />
            <div className="text-muted-foreground">
              {"  "}Reason:  <span className="text-foreground/70">PostgreSQL connection string with credentials</span>
            </div>
            <div className="text-muted-foreground">
              {"  "}Pattern: <span className="text-foreground/70">PostgreSQL URL</span>
            </div>
            <div className="h-2" />
            <div className="text-muted-foreground">
              {"  "}Your prompt was not sent. Remove the sensitive value and try again.
            </div>
            <div className="text-muted-foreground/50">
              {"  "}To disable: codeusage guard disable
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
