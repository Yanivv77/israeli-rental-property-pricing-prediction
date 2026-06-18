import { Building2 } from "lucide-react";
import { ValuationForm } from "@/components/valuation-form";

/**
 * Front door (the "waiter"): address + subject attributes → /report. The form
 * is the only client component; this page is a Server Component shell.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-10 p-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="bg-brand-soft text-brand inline-flex size-12 items-center justify-center rounded-2xl">
          <Building2 className="size-6" aria-hidden />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          הערכת שווי נכס
        </h1>
        <p className="text-muted-foreground max-w-md text-balance">
          הערכה מבוססת עסקאות נדל&quot;ן אמיתיות שבוצעו באותו גוש. החישוב נעשה בקוד —
          ה‑AI רק מסביר את התוצאה בעברית.
        </p>
      </header>

      <section className="bg-card rounded-2xl border p-6 shadow-sm sm:p-7">
        <ValuationForm />
      </section>

      <p className="text-muted-foreground text-center text-xs">
        מקור הנתונים: עסקאות נדל&quot;ן ממשלתיות (govmap / רשות המיסים). תוצאות נשמרות
        במטמון לפי גוש לזירוז חיפושים חוזרים.
      </p>
    </main>
  );
}
