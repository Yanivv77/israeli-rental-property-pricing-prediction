import Link from "next/link";
import {
  ArrowRight,
  Database,
  MapPin,
  RadioTower,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { valuate, type Report } from "@/lib/valuate";
import { SubjectInputSchema, type Confidence } from "@/types/property";
import { PriceTrend, CompsBar } from "@/components/charts/client";

const nis = (n: number | null | undefined) =>
  n == null ? "—" : "₪" + new Intl.NumberFormat("he-IL").format(Math.round(n));
const heDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("he-IL", { month: "short", year: "numeric" }) : "—";

const CONFIDENCE: Record<Confidence, { label: string; cls: string }> = {
  high: { label: "ביטחון גבוה", cls: "bg-success/10 text-success" },
  medium: { label: "ביטחון בינוני", cls: "bg-brand/10 text-brand" },
  low: { label: "ביטחון נמוך", cls: "bg-warning/10 text-warning" },
  insufficient: { label: "מדגם קטן", cls: "bg-muted text-muted-foreground" },
};

function BackLink() {
  return (
    <Link
      href="/"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
    >
      <ArrowRight className="size-4" aria-hidden />
      חזרה לחיפוש
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-7 p-6">{children}</main>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = SubjectInputSchema.safeParse(await searchParams);
  if (!parsed.success) {
    return (
      <Shell>
        <BackLink />
        <StateCard title="לא הוזנה כתובת" body="חזרו לעמוד הראשי והזינו כתובת לחיפוש." />
      </Shell>
    );
  }

  const report = await valuate(parsed.data);
  return (
    <Shell>
      <BackLink />
      <Body report={report} address={parsed.data.address} />
    </Shell>
  );
}

function Body({ report, address }: { report: Report; address: string }) {
  if (report.status === "no-match") {
    return (
      <StateCard
        title="הכתובת לא נמצאה"
        body={`לא הצלחנו לאתר את "${address}". בדקו את האיות ונסו לכלול עיר ומספר בית.`}
      />
    );
  }
  if (report.status === "ambiguous") {
    return (
      <StateCard title="הכתובת אינה חד‑משמעית" body="התכוונתם לאחת מהאפשרויות הבאות? הוסיפו מספר בית ועיר לחיפוש מדויק:">
        <ul className="mt-3 flex flex-col gap-2">
          {report.options.map((o) => (
            <li key={o.label}>
              <Link
                href={`/report?address=${encodeURIComponent(o.label)}`}
                className="bg-muted hover:bg-brand-soft hover:text-brand flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
              >
                <MapPin className="size-4 shrink-0" aria-hidden />
                <bdi>{o.label}</bdi>
              </Link>
            </li>
          ))}
        </ul>
      </StateCard>
    );
  }
  if (report.status === "no-data") {
    return (
      <StateCard
        title="אין מספיק עסקאות"
        body={`מצאנו את הכתובת "${address}" אך אין מספיק עסקאות אחרונות בגוש כדי להעריך שווי באמינות.`}
      />
    );
  }
  if (report.status === "error") {
    return <StateCard title="שגיאה זמנית" body={report.message} />;
  }
  return <Result report={report} />;
}

function StateCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-balance">{body}</p>
      <div className="text-start">{children}</div>
    </section>
  );
}

function Result({ report }: { report: Extract<Report, { status: "ok" }> }) {
  const { subject, stats, deals, summary, source } = report;
  const conf = CONFIDENCE[stats.confidence];

  // Serializable chart data (computed server-side; charts only render).
  const trend = deals
    .filter((d) => d.dealDate && d.amount && d.area)
    .map((d) => ({ t: +new Date(d.dealDate!), ppsqm: Math.round(d.amount! / d.area!), label: d.address ?? "" }))
    .sort((a, b) => a.t - b.t);
  const comps = stats.comps
    .filter((d) => d.amount && d.area)
    .map((d) => ({ label: d.address ?? "", ppsqm: Math.round(d.amount! / d.area!) }))
    .sort((a, b) => b.ppsqm - a.ppsqm)
    .slice(0, 30);
  const subjectPpsqm =
    subject.area && subject.askingPrice ? Math.round(subject.askingPrice / subject.area) : null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <bdi>{subject.address.raw}</bdi>
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            גוש <bdi className="nums font-medium">{subject.gushHelka.gush}</bdi>
            {subject.gushHelka.helka != null && (
              <>
                {" · "}חלקה <bdi className="nums font-medium">{subject.gushHelka.helka}</bdi>
              </>
            )}
          </p>
        </div>
        <SourceBadge source={source} />
      </header>

      <Verdict stats={stats} />

      <section className="bg-card reveal rounded-2xl border p-6">
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          הסבר
        </h2>
        <p className="leading-relaxed text-pretty whitespace-pre-line">{summary}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label='חציון ₪/מ"ר' value={nis(stats.pricePerSqmMedian)} />
        <Stat label='ממוצע ₪/מ"ר' value={nis(stats.pricePerSqmMean)} />
        <Stat label="עסקאות משוות" value={String(stats.sampleSize)} sub={`מתוך ${stats.blockSampleSize} בגוש`} />
        <Stat label="רמת ביטחון" badge={conf} />
      </section>

      <section className="bg-card reveal rounded-2xl border p-6">
        <h2 className="mb-1 font-semibold">מחיר למ&quot;ר לאורך זמן</h2>
        <p className="text-muted-foreground mb-4 text-sm">כל נקודה היא עסקה בגוש בשנתיים האחרונות.</p>
        <PriceTrend data={trend} median={stats.pricePerSqmMedian} />
      </section>

      <section className="bg-card reveal rounded-2xl border p-6">
        <h2 className="mb-1 font-semibold">עסקאות משוות מול הנכס</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          {subjectPpsqm != null
            ? "הקו הכתום הוא המחיר המבוקש למ\"ר; עמודות מתחתיו זולות ממנו."
            : "המחיר למ\"ר בכל אחת מהעסקאות המשוות, מול החציון."}
        </p>
        <CompsBar data={comps} median={stats.pricePerSqmMedian} subject={subjectPpsqm} />
      </section>

      <CompsTable deals={deals.slice(0, 12)} />
    </>
  );
}

function Verdict({ stats }: { stats: Extract<Report, { status: "ok" }>["stats"] }) {
  const pct = stats.deltaPct;
  // Headline number + verdict tone. Falls back gracefully when inputs are sparse.
  let tone = "brand";
  let Icon = Minus;
  let verdict = "תואם לשווי השוק";
  if (pct != null) {
    if (pct > 0.07) { tone = "warning"; Icon = TrendingUp; verdict = `המחיר המבוקש גבוה ב‑${(pct * 100).toFixed(0)}% מהשווי המוערך`; }
    else if (pct < -0.07) { tone = "success"; Icon = TrendingDown; verdict = `המחיר המבוקש נמוך ב‑${(Math.abs(pct) * 100).toFixed(0)}% מהשווי המוערך`; }
    else verdict = "המחיר המבוקש תואם את השווי המוערך";
  }
  const headline =
    stats.estimatedValue != null ? nis(stats.estimatedValue) : nis(stats.pricePerSqmMedian);
  const headlineLabel = stats.estimatedValue != null ? "שווי מוערך" : 'חציון ₪/מ"ר בגוש';

  return (
    <section
      className={`reveal rounded-2xl border p-7 ${
        tone === "warning" ? "border-warning/30 bg-warning/5"
        : tone === "success" ? "border-success/30 bg-success/5"
        : "border-brand/30 bg-brand-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{headlineLabel}</p>
          <p className="nums mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
            <bdi>{headline}</bdi>
          </p>
        </div>
        <span
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full ${
            tone === "warning" ? "bg-warning/15 text-warning"
            : tone === "success" ? "bg-success/15 text-success"
            : "bg-brand/15 text-brand"
          }`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p
        className={`mt-4 text-base font-medium ${
          tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-brand"
        }`}
      >
        {verdict}
      </p>
      {stats.askingPrice != null && (
        <p className="text-muted-foreground mt-1 text-sm">
          מחיר מבוקש: <bdi className="nums font-medium">{nis(stats.askingPrice)}</bdi>
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  badge,
}: {
  label: string;
  value?: string;
  sub?: string;
  badge?: { label: string; cls: string };
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      {badge ? (
        <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-sm font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      ) : (
        <p className="nums mt-1 text-lg font-semibold">
          <bdi>{value}</bdi>
        </p>
      )}
      {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
    </div>
  );
}

function SourceBadge({ source }: { source: "cache" | "gov" }) {
  return source === "cache" ? (
    <span className="bg-brand-soft text-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
      <Database className="size-3.5" aria-hidden />
      מהמטמון
    </span>
  ) : (
    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
      <RadioTower className="size-3.5" aria-hidden />
      נתונים טריים
    </span>
  );
}

function CompsTable({ deals }: { deals: Extract<Report, { status: "ok" }>["deals"] }) {
  return (
    <section className="bg-card reveal overflow-hidden rounded-2xl border">
      <h2 className="border-b p-6 pb-4 font-semibold">עסקאות אחרונות בגוש</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground bg-muted/40 text-xs">
            <tr>
              {["תאריך", "כתובת", "חדרים", 'שטח', "מחיר", '₪/מ"ר'].map((h) => (
                <th key={h} className="p-3 text-start font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="nums p-3 whitespace-nowrap"><bdi>{heDate(d.dealDate)}</bdi></td>
                <td className="p-3"><bdi>{d.address ?? "—"}</bdi></td>
                <td className="nums p-3"><bdi>{d.rooms ?? "—"}</bdi></td>
                <td className="nums p-3 whitespace-nowrap"><bdi>{d.area ? `${d.area} מ"ר` : "—"}</bdi></td>
                <td className="nums p-3 whitespace-nowrap"><bdi>{nis(d.amount)}</bdi></td>
                <td className="nums p-3 whitespace-nowrap font-medium">
                  <bdi>{d.amount && d.area ? nis(d.amount / d.area) : "—"}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
