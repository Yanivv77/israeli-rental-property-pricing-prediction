import Link from "next/link";

/**
 * Address input — the "waiter" front door. Stub only: the form has no submit
 * logic yet. It navigates to /report via a plain GET so the skeleton is
 * walkable; the real flow (geocode → deals → stats → narrative) is wired in
 * prompts 02/03 as a Server Action.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 p-6">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          הערכת שווי נכס
        </h1>
        <p className="text-muted-foreground text-balance">
          הזינו כתובת ונשלוף עבורכם עסקאות אחרונות באותו גוש, נחשב סטטיסטיקה
          ונסביר בעברית.
        </p>
      </header>

      <form
        action="/report"
        method="get"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          name="address"
          dir="rtl"
          autoComplete="off"
          placeholder="לדוגמה: דיזנגוף 100, תל אביב"
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-12 w-full rounded-md border px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center justify-center rounded-md px-6 text-base font-medium transition-colors"
        >
          הערכה
        </button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        שלד בלבד — אין כאן עדיין קריאות לשרתי הממשלה או ל‑AI. אפשר לצפות{" "}
        <Link href="/report" className="underline underline-offset-4">
          בדף הדוח לדוגמה
        </Link>
        .
      </p>
    </main>
  );
}
