"use client";

import { useEffect, useRef, useState } from "react";

// Animates the numeric part of a formatted stat ("$1.2M", "45", "83%").
// Non-numeric or multi-number strings render as-is.
export default function CountUp({ text }: { text: string }) {
  const m = /^([^0-9-]*)(-?[\d,]+(?:\.\d+)?)([^0-9]*)$/.exec(text);
  const [display, setDisplay] = useState(m ? `${m[1]}0${m[3]}` : text);
  const done = useRef(false);

  useEffect(() => {
    if (!m || done.current) {
      setDisplay(text);
      return;
    }
    done.current = true;
    const prefix = m[1];
    const suffix = m[3];
    const target = parseFloat(m[2].replace(/,/g, ""));
    const decimals = (m[2].split(".")[1] ?? "").length;
    const hasCommas = m[2].includes(",");
    const dur = 700;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      const num = hasCommas
        ? Math.round(v).toLocaleString("en-US")
        : v.toFixed(decimals);
      setDisplay(`${prefix}${num}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <>{display}</>;
}
