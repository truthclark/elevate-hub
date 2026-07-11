"use client";

// Dependency-free confetti burst. Fired on wins: closing a deal, clearing
// your day. Respects prefers-reduced-motion.

const COLORS = ["#05c3f9", "#34d399", "#fbbf24", "#a78bfa", "#f472b6", "#3fd0fb"];

export function fireConfetti(count = 90) {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(root);

  const cx = window.innerWidth / 2;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const size = 6 + Math.random() * 7;
    const angle = Math.random() * Math.PI * 2;
    const dist = 140 + Math.random() * Math.min(420, window.innerWidth / 2);
    const dx = Math.cos(angle) * dist;
    const dy = Math.abs(Math.sin(angle)) * dist + 320 + Math.random() * 260;
    el.style.cssText = `
      position:absolute;
      left:${cx + (Math.random() - 0.5) * 160}px;
      top:${window.innerHeight * 0.28}px;
      width:${size}px;
      height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;
      background:${COLORS[i % COLORS.length]};
      border-radius:${Math.random() > 0.6 ? "50%" : "2px"};
      --cx:${dx}px;
      --cy:${dy}px;
      --cr:${(Math.random() - 0.5) * 900}deg;
      animation:confetti-fall ${1.3 + Math.random() * 0.9}s cubic-bezier(.2,.6,.4,1) forwards;
    `;
    root.appendChild(el);
  }
  setTimeout(() => root.remove(), 2600);
}
