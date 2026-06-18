"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search } from "lucide-react";

/**
 * The only client component: it collects the address + (optional) subject
 * attributes and navigates to /report with them as query params. No data
 * fetching here — the report Server Component runs the whole flow server-side.
 */
const numField = (
  name: string,
  label: string,
  placeholder: string,
  extra?: Record<string, string | number>,
) => ({ name, label, placeholder, extra });

// step="any" on the continuous fields: a fixed step also enforces validation, so
// step:1000 would silently reject a normal price like 5,200,000 and block submit.
const FIELDS = [
  numField("area", 'שטח (מ"ר)', "85", { min: 1, step: "any" }),
  numField("rooms", "חדרים", "3.5", { min: 1, step: "0.5" }),
  numField("floor", "קומה", "4", { step: 1 }),
  numField("askingPrice", "מחיר מבוקש (₪)", "2,400,000", { min: 1, step: "any" }),
];

export function ValuationForm() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      const s = String(v).trim();
      if (s) params.set(k, s);
    }
    if (!params.get("address")) return;
    start(() => router.push(`/report?${params.toString()}`));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="address" className="text-sm font-medium">
          כתובת הנכס
        </label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 start-4"
            aria-hidden
          />
          <input
            id="address"
            name="address"
            type="text"
            required
            dir="rtl"
            autoComplete="off"
            placeholder="לדוגמה: דיזנגוף 50, תל אביב"
            className="border-input bg-background focus-visible:border-brand focus-visible:ring-brand/30 h-14 w-full rounded-xl border ps-12 pe-4 text-base outline-none transition-colors focus-visible:ring-4"
          />
        </div>
      </div>

      <fieldset className="grid grid-cols-2 gap-4">
        <legend className="text-muted-foreground mb-1 text-sm">
          פרטי הנכס (אופציונלי — משפרים את הדיוק)
        </legend>
        {FIELDS.map((f) => (
          <div key={f.name} className="flex flex-col gap-1.5">
            <label htmlFor={f.name} className="text-muted-foreground text-xs font-medium">
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type="number"
              inputMode="decimal"
              dir="rtl"
              placeholder={f.placeholder}
              {...f.extra}
              className="border-input bg-background focus-visible:border-brand focus-visible:ring-brand/30 nums h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus-visible:ring-4"
            />
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        {[
          { name: "parking", label: "חניה" },
          { name: "elevator", label: "מעלית" },
        ].map((t) => (
          <label
            key={t.name}
            className="border-input has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors select-none"
          >
            <input type="checkbox" name={t.name} value="1" className="accent-brand size-4" />
            {t.label}
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-brand-foreground hover:bg-brand/90 focus-visible:ring-brand/40 mt-1 inline-flex h-13 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold transition-colors outline-none focus-visible:ring-4 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            מחשב הערכה…
          </>
        ) : (
          "חשב הערכת שווי"
        )}
      </button>
    </form>
  );
}
