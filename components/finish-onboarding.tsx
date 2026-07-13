"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishOnboarding } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { Rocket, Loader2 } from "lucide-react";

// The setup finale deserves a moment before the dashboard lights up.
export default function FinishOnboarding({ allDone }: { allDone: boolean }) {
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={busy}
      onClick={() => {
        fireConfetti(100);
        start(async () => {
          await finishOnboarding();
          // let the confetti land before the scene change
          await new Promise((r) => setTimeout(r, 900));
          router.push("/");
        });
      }}
      className="flex items-center gap-2 rounded-2xl bg-elevate-500 px-6 py-3.5 font-display text-sm font-bold text-ink transition hover:bg-elevate-400"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
      {allDone ? "Launch my hub" : "Finish setup — take me to the dashboard"}
    </button>
  );
}
