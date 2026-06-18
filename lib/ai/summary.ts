import "server-only";
import { GoogleGenAI } from "@google/genai";
import { CBS_RENT, type RentEstimate } from "@/lib/rent/cbs";
import type { Subject, ValuationStats } from "@/types/property";

/**
 * Gemini writes a human Hebrew explanation of the already-computed numbers.
 * The model only narrates `stats` — it never computes, alters, or invents a
 * value, and never decides which deals are relevant. Every figure it sees was
 * produced in lib/stats. Node runtime.
 */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";

const SYSTEM = `אתה אנליסט נדל"ן ישראלי שמסביר ללקוח הערכת שווי שכבר חושבה במלואה.
חוקי ברזל — אין לעבור עליהם בשום מצב:
1. אסור לבצע חישוב כלשהו: לא חיבור, לא חיסור, לא כפל, לא חילוק ולא חישוב אחוזים. כל המספרים והאחוזים כבר חושבו עבורך.
2. כשאתה מזכיר מספר או אחוז — העתק אותו מילה במילה מהנתונים שסופקו. אסור לכתוב מספר או אחוז שאינו מופיע ברשימה.
3. תפקידך להסביר במילים בלבד האם המחיר המבוקש סביר, ולהתייחס ליתרונות (חניה/מעלית) ולרמת הביטחון של ההערכה.
4. הזכר במשפט אחד את שכר הדירה החודשי המשוער (נתון הלמ"ס) — זהו ממוצע אזורי, לא הערכה לנכס הספציפי.
5. 3 עד 5 משפטים בעברית. בלי כותרות, בלי רשימות, בלי תגיות. טון מקצועי, מאוזן וברור.`;

const nis = (n: number | null | undefined) =>
  n == null ? "לא ידוע" : "₪" + new Intl.NumberFormat("he-IL").format(Math.round(n));

const CONFIDENCE_HE: Record<string, string> = {
  high: "גבוהה",
  medium: "בינונית",
  low: "נמוכה",
  insufficient: "נמוכה מאוד (מדגם קטן)",
};

// Every number the model is allowed to use, pre-formatted as the exact string
// to copy. No formulas are shown — a formula would invite the model to redo the
// math (which it must never do).
function facts(stats: ValuationStats, subject: Subject, rent: RentEstimate): string {
  const a = subject.area;
  const dir =
    stats.deltaPct == null
      ? null
      : stats.deltaPct > 0.07
        ? "גבוה מהשווי המוערך"
        : stats.deltaPct < -0.07
          ? "נמוך מהשווי המוערך"
          : "תואם את השווי המוערך";
  return [
    `כתובת הנכס: ${subject.address.raw}`,
    `גוש: ${subject.gushHelka.gush}`,
    a != null ? `שטח: ${a} מ"ר` : `שטח: לא צוין`,
    subject.rooms != null ? `חדרים: ${subject.rooms}` : null,
    subject.floor != null ? `קומה: ${subject.floor}` : null,
    `חניה: ${subject.parking ? "יש" : "לא צוין"}`,
    `מעלית: ${subject.elevator ? "יש" : "לא צוין"}`,
    `מחיר מבוקש: ${nis(stats.askingPrice)}`,
    `מחיר חציוני למ"ר בגוש: ${nis(stats.pricePerSqmMedian)}`,
    `שווי מוערך לנכס: ${nis(stats.estimatedValue)}`,
    stats.deltaPct != null
      ? `אחוז הפער בין המבוקש למוערך: ${(stats.deltaPct * 100).toFixed(1)}%`
      : null,
    dir ? `מסקנת המערכת: המחיר המבוקש ${dir}` : null,
    `מספר עסקאות משוות: ${stats.sampleSize}`,
    `מספר עסקאות בגוש: ${stats.blockSampleSize}`,
    `רמת ביטחון: ${CONFIDENCE_HE[stats.confidence] ?? stats.confidence}`,
    `שכר דירה חודשי משוער (הלמ"ס, ${CBS_RENT.period}): ${nis(rent.monthly)}` +
      (rent.basis === "city" ? ` (ממוצע ${rent.city})` : " (ממוצע ארצי לפי גודל)"),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateSummary(
  stats: ValuationStats,
  subject: Subject,
  rent: RentEstimate,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: `הנתונים שכבר חושבו (השתמש אך ורק במספרים האלה, כפי שהם):\n${facts(stats, subject, rent)}\n\nכתוב הסבר קצר בעברית: האם המחיר המבוקש מוצדק? הסבר במילים, בלי לחשב מספרים חדשים.`,
    config: { systemInstruction: SYSTEM, temperature: 0, maxOutputTokens: 400 },
  });

  const text = (res.text ?? "").trim();
  if (!text) throw new Error("Gemini returned empty narrative");
  return text;
}
