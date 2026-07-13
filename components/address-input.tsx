"use client";

import { useEffect, useRef, useState } from "react";
import { inputCls } from "./modal";
import { MapPin } from "lucide-react";

// Address autocomplete backed by the free Photon geocoder (OpenStreetMap).
// No API key. If the service is unreachable it behaves like a plain input.

interface Suggestion {
  label: string;
}

function format(p: Record<string, string | undefined>): string {
  const line = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "";
  const parts = [line, p.city || p.district, [p.state, p.postcode].filter(Boolean).join(" ")].filter(Boolean);
  return parts.join(", ");
}

export default function AddressInput({
  name,
  defaultValue,
  onValueChange,
}: {
  name: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void; // for controlled parents (form experience)
}) {
  const [value, setValueRaw] = useState(defaultValue ?? "");
  const setValue = (v: string) => {
    setValueRaw(v);
    onValueChange?.(v);
  };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const search = (q: string) => {
    setValue(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 4) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          features?: { properties: Record<string, string | undefined> }[];
        };
        const seen = new Set<string>();
        const out: Suggestion[] = [];
        for (const f of data.features ?? []) {
          const p = f.properties;
          if (p.countrycode && p.countrycode !== "US") continue;
          const label = format(p);
          if (label && !seen.has(label)) {
            seen.add(label);
            out.push({ label });
          }
        }
        setSuggestions(out);
        setOpen(out.length > 0);
      } catch {
        // offline or blocked — stay a plain input
      }
    }, 300);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        name={name}
        value={value}
        onChange={(e) => search(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        placeholder="Start typing an address…"
        className={inputCls}
      />
      {open && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-mist bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => {
                  setValue(s.label);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-elevate-50"
              >
                <MapPin size={13} className="shrink-0 text-elevate-600" />
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
