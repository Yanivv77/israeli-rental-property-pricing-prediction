import Link from "next/link";

/**
 * Report view — placeholder. Renders the slots the real report will fill
 * (computed stats, comps, charts, Hebrew narrative). No data is fetched here:
 * the data/stats/AI layers are stubbed until prompts 02/03. A Server Component
 * will call the data layer directly — no internal API hop.
 */
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>;
}) {
  const { address } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <Link
          href="/"
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          ← חזרה לחיפוש
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">דוח הערכה</h1>
        {address ? (
          <p className="text-muted-foreground">
            כתובת שהוזנה: <bdi className="font-medium">{address}</bdi>
          </p>
        ) : (
          <p className="text-muted-foreground">לא הוזנה כתובת.</p>
        )}
      </header>

      <section className="border-border rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          כאן יופיעו הערכת השווי, העסקאות המשוות, הגרפים וההסבר בעברית.
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          השלד מוכן — המנוע מחובר בפרומפטים 02 ו‑03.
        </p>
      </section>
    </main>
  );
}
