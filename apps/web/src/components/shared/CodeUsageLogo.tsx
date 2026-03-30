"use client";

import { cn } from "@/lib/utils";

interface CodeusageLogoProps {
  className?: string;
  size?: number;
}

/**
 * Codeusage brand logo - circular progress with </> code symbol
 */
export function CodeusageLogo({ className, size = 48 }: CodeusageLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Background circle (faded) */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.3"
      />
      {/* Progress arc */}
      <path
        d="M24 4A20 20 0 0 1 44 24A20 20 0 0 1 34 40"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Left bracket < */}
      <path
        d="M18 18L14 24L18 30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right bracket > */}
      <path
        d="M30 18L34 24L30 30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Slash / */}
      <path
        d="M26 16L22 32"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Codeusage logo with fixed brand color
 */
export function CodeusageLogoBrand({ className, size = 48 }: CodeusageLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Background circle (faded) */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="#D97757"
        strokeWidth="3"
        opacity="0.3"
      />
      {/* Progress arc */}
      <path
        d="M24 4A20 20 0 0 1 44 24A20 20 0 0 1 34 40"
        stroke="#D97757"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Left bracket < */}
      <path
        d="M18 18L14 24L18 30"
        stroke="#D97757"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right bracket > */}
      <path
        d="M30 18L34 24L30 30"
        stroke="#D97757"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Slash / */}
      <path
        d="M26 16L22 32"
        stroke="#D97757"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
