import { API_BASE } from './config';
import type {
  ActionStep,
  ExplainResponse,
  Explanation,
  KeyDate,
  LetterCategory,
} from './types';

/**
 * CivicHelper explainer.
 *
 * Live path: POST /api/explain (same origin on web, or EXPO_PUBLIC_API_URL
 * for native) — a Python serverless function that calls Gemini
 * gemini-3.5-flash-lite with the key server-side only. When the endpoint
 * does not answer, the app falls back to the on-device demo explainer
 * below and says so honestly (source 'demo'). The demo explainer is a
 * rule-based reader: it pulls dates, amounts and action sentences out
 * of the letter text — it never invents facts that are not in the text.
 */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoOf(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** '2027-04-01' -> '1 Apr 2027'. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTH_SHORT[m - 1]} ${y}`;
}

/** Whole days from today until the date (negative = past). */
export function daysUntil(iso: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  return Math.round((target - today) / 86400000);
}

/** '2027-04-01' -> 'in 5 days' / 'today' / '5 days ago'. */
export function dueLabel(iso: string): string {
  const n = daysUntil(iso);
  if (n < 0) return `${-n} day${-n === 1 ? '' : 's'} overdue`;
  if (n === 0) return 'due today';
  if (n === 1) return 'due tomorrow';
  return `due in ${n} days`;
}

export type Urgency = 'urgent' | 'soon' | 'none';

/** Red when a deadline is within 7 days, amber for any deadline further
 * out, gray only when there is no deadline at all. */
export function urgencyFor(dueDate: string | null | undefined): Urgency {
  if (!dueDate) return 'none';
  const n = daysUntil(dueDate);
  if (n < 0) return 'none';
  if (n <= 7) return 'urgent';
  return 'soon';
}

interface FoundDate {
  date: string;
  /** Words around the date, for a label. */
  context: string;
  /** Label hint when the date came from a "within N months" window. */
  hint?: string;
}

function extractDates(text: string): FoundDate[] {
  const found: FoundDate[] = [];
  const push = (y: number, m: number, d: number, at: number) => {
    if (y < 2020 || y > 2040 || m < 1 || m > 12 || d < 1 || d > 31) return;
    // "within 2 months of 18 November 2026" names the letter date, not
    // the deadline — shift the date forward by the stated window.
    const window = text.slice(Math.max(0, at - 90), at + 90);
    const within = window.match(/within\s+(\d+)\s+(month|months|day|days|week|weeks)/i);
    let date = new Date(y, m - 1, d);
    if (within) {
      const n = Number(within[1]);
      const unit = within[2].toLowerCase();
      if (unit.startsWith('month')) date.setMonth(date.getMonth() + n);
      else if (unit.startsWith('week')) date.setDate(date.getDate() + n * 7);
      else date.setDate(date.getDate() + n);
    }
    const iso = isoOf(date.getFullYear(), date.getMonth() + 1, date.getDate());
    if (found.some((f) => f.date === iso)) return;
    const start = Math.max(0, at - 40);
    const hint = within
      ? window.toLowerCase().includes('appeal')
        ? 'Appeal deadline'
        : window.toLowerCase().includes('pay')
          ? 'Payment due'
          : undefined
      : undefined;
    found.push({ date: iso, context: text.slice(start, at), hint });
  };
  const monthName = `(${MONTHS.join('|')})`;
  let match: RegExpExecArray | null;
  const dmy = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthName}\\s+(\\d{4})`, 'gi');
  while ((match = dmy.exec(text)) !== null) {
    push(Number(match[3]), MONTHS.indexOf(match[2].toLowerCase()) + 1, Number(match[1]), match.index);
  }
  const mdy = new RegExp(`${monthName}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`, 'gi');
  while ((match = mdy.exec(text)) !== null) {
    push(Number(match[3]), MONTHS.indexOf(match[1].toLowerCase()) + 1, Number(match[2]), match.index);
  }
  const numeric = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  while ((match = numeric.exec(text)) !== null) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    // Day-first (UK style) — the letters CivicHelper reads are UK-style.
    push(Number(match[3]), b, a, match.index);
  }
  return found.sort((a, b) => a.date.localeCompare(b.date));
}

function extractMoney(text: string): string[] {
  const out: string[] = [];
  const re = /[£$€]\s?[\d,]+(?:\.\d{2})?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (!out.includes(match[0])) out.push(match[0]);
  }
  return out;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:call|phone|telephone|tel\.?)\D{0,12}(\d[\d\s]{8,14}\d)/i)
    ?? text.match(/\b0\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/);
  return match ? (match[1] ?? match[0]).trim() : null;
}

function sentencesOf(text: string): string[] {
  // Split line by line first: official letters put their title and the
  // greeting on their own lines, and those are not sentences. A line
  // with no sentence-ending punctuation and eight words or fewer is a
  // header, not content.
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const clean = line.replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    if (!/[.!?]$/.test(clean) && clean.split(' ').length <= 8) continue;
    for (const part of clean.split(/(?<=[.!?])\s+/)) {
      const s = part.trim();
      if (s.length > 12) out.push(s);
    }
  }
  return out;
}

const KEY_WORDS = [
  'pay', 'payment', 'due', 'deadline', 'before', 'must', 'need to', 'required',
  'appointment', 'attend', 'bring', 'send', 'reply', 'appeal', 'contact', 'call',
  'visit', 'complete', 'form', 'charge', 'increase', 'change', 'amount', 'balance',
  'owe', 'miss', 'affect', 'switch', 'end', 'start',
];

function isKeySentence(s: string): boolean {
  const lower = s.toLowerCase();
  if (/^(dear|reference|ref\.?|account|your ref)/i.test(s)) return false;
  return KEY_WORDS.some((w) => lower.includes(w));
}

function cleanSentence(s: string): string {
  return s.replace(/^(Dear [^,]+,\s*)/i, '').trim();
}

function dateLabel(context: string, fallback: string): string {
  // Context is the words just before the date, so the closest verb wins:
  // "ends on 31 January" vs "From 1 February" sit in the same paragraph.
  const c = context.toLowerCase();
  if (c.includes('appointment')) return 'Appointment';
  if (c.includes('appeal')) return 'Appeal deadline';
  if (c.includes('first payment') || c.includes('first instalment') || c.includes('first installment')) return 'First payment due';
  if (c.includes('due') || c.includes('pay')) return 'Payment due';
  if (c.includes('from') || c.includes('start')) return 'Starts';
  if (c.includes('end')) return 'Ends';
  return fallback;
}

/** The soonest deadline that still lies ahead: first the earliest
 * undone step deadline, else the earliest key date ahead, else null.
 * A letter's due date is never a date already in the past. */
export function soonestDue(explanation: Explanation): string | null {
  const today = new Date();
  const todayIso = isoOf(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const stepDates = explanation.steps
    .map((s) => s.deadline)
    .filter((d): d is string => !!d)
    .sort();
  const ahead = stepDates.find((d) => d >= todayIso);
  if (ahead) return ahead;
  const keyAhead = explanation.keyDates.map((k) => k.date).sort().find((d) => d >= todayIso);
  return keyAhead ?? null;
}

/** The honest on-device demo explainer — reads only what is in the text. */
export function demoExplain(text: string, sender: string, title: string): Explanation {
  const dates = extractDates(text);
  const money = extractMoney(text);
  const phone = extractPhone(text);
  const sentences = sentencesOf(text);
  const key = sentences.filter(isKeySentence).map(cleanSentence);

  // Dates inside each sentence, so a step can use its own sentence's date.
  // Keyed by the cleaned sentence text, matching the `key` list below.
  const sentenceDates = new Map<string, string[]>();
  for (const s of key) {
    const found = extractDates(s).map((d) => d.date);
    if (found.length > 0) sentenceDates.set(s, found);
  }
  const earliestFuture = (): string | null => {
    const today = new Date();
    const todayIso = isoOf(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return dates.find((d) => d.date >= todayIso)?.date ?? dates[0]?.date ?? null;
  };
  // The date a "due" sentence names — the payment/action deadline.
  const dueSentence = key.find((s) => /\b(due|deadline)\b/i.test(s) && sentenceDates.has(s));
  const dueDate = dueSentence
    ? (sentenceDates.get(dueSentence)?.[0] ?? null)
    : earliestFuture();

  // Summary: the first sentence that names money or a date — that is
  // usually the sentence that says what the letter is about. The pool
  // is wider than the key sentences: a sentence can be informative
  // without an action word ("Your Council Tax ... is £1,842.00.").
  const summaryCandidates = sentences
    .map(cleanSentence)
    .filter(
      (s) =>
        isKeySentence(s) ||
        money.some((m) => s.includes(m)) ||
        extractDates(s).length > 0,
    );
  const summarySentence =
    summaryCandidates.find((s) => money.some((m) => s.includes(m)) || extractDates(s).length > 0) ??
    summaryCandidates[0];
  const summary = summarySentence
    ? summarySentence
    : 'This letter is about your account with ' + (sender || 'the sender') + '. Read it through and note any dates and amounts.';

  const meaningBits: string[] = [];
  if (money.length > 0) {
    const amounts = money.map((m) => parseFloat(m.replace(/[^0-9.]/g, '')) || 0);
    const largest = money[amounts.indexOf(Math.max(...amounts))];
    meaningBits.push(
      `The letter mentions ${largest}${money.length > 1 ? ` (and ${money.length - 1} other amount${money.length > 2 ? 's' : ''})` : ''}.`,
    );
  }
  if (dueDate) meaningBits.push(`The main date to remember is ${formatDate(dueDate)}.`);
  meaningBits.push('Nothing in this letter is final until you act on it — the steps below are what to do, in order.');
  const meaning = meaningBits.join(' ');

  const steps: ActionStep[] = [];
  const addStep = (t: string, deadline?: string | null) => {
    const clean = t.replace(/\s+/g, ' ').trim();
    if (clean.length < 8 || clean.length > 160) return;
    if (steps.some((s) => s.text.toLowerCase() === clean.toLowerCase())) return;
    steps.push({ id: `step-${steps.length + 1}`, text: clean, deadline: deadline ?? null, done: false });
  };
  const firstDate = dates[0]?.date ?? null;
  for (const s of key) {
    const lower = s.toLowerCase();
    const ownDate = sentenceDates.get(s)?.[0] ?? null;
    const ownMoney = money.find((m) => s.includes(m)) ?? null;
    if (/\b(pay|payment)\b/.test(lower) && ownMoney) {
      // A payment step only when the sentence itself names an amount —
      // "struggling to pay, call us" is not a payment due.
      addStep(`Pay ${ownMoney}${dueDate ? ` by ${formatDate(dueDate)}` : ''}`, dueDate);
    } else if (/\b(due|deadline)\b/.test(lower) && ownDate && money.length > 0 && !steps.some((x) => x.text.startsWith('Pay '))) {
      addStep(`Pay ${money[0]} by ${formatDate(ownDate)}`, ownDate);
    } else if (lower.includes('appointment')) {
      if (!steps.some((x) => x.text.startsWith('Go to your appointment'))) {
        addStep(`Go to your appointment${ownDate ? ` on ${formatDate(ownDate)}` : ''} — bring photo ID and any papers the letter asks for`, ownDate);
      }
    } else if (lower.includes('bring')) {
      addStep(s.length > 120 ? 'Bring the documents the letter asks for' : s, ownDate);
    } else if (/\b(appeal|disagree|challenge)\b/.test(lower)) {
      if (!steps.some((x) => x.text.startsWith('If you disagree'))) {
        addStep(`If you disagree, appeal${ownDate ? ` before ${formatDate(ownDate)}` : ''} — the letter says how`, ownDate);
      }
    } else if (/\b(call|contact|phone)\b/.test(lower) && phone) {
      if (!steps.some((x) => x.text.startsWith('Call '))) {
        addStep(`Call ${sender || 'the sender'} on ${phone} if anything is unclear`, null);
      }
    } else if (/\b(send|reply|return)\b/.test(lower)) {
      addStep(`Send your reply${ownDate ? ` by ${formatDate(ownDate)}` : ''}`, ownDate);
    } else if (/\b(complete|fill|fill in)\b/.test(lower) && lower.includes('form')) {
      addStep(`Fill in the form and return it${ownDate ? ` by ${formatDate(ownDate)}` : ''}`, ownDate);
    } else if (/\b(switch|change tariff|change supplier)\b/.test(lower)) {
      addStep('If the new price does not suit you, compare other tariffs before the old one ends', firstDate);
    } else if (lower.includes('increase') || lower.includes('change')) {
      addStep('Check the new amount and update your payment if needed', ownDate);
    }
    if (steps.length >= 5) break;
  }
  if (steps.length === 0 && firstDate) {
    addStep(`Note the date ${formatDate(firstDate)} and act before then`, firstDate);
  }
  if (steps.length === 0) {
    addStep('Read the letter once more and note anything it asks you to do', null);
  }

  const keyDates: KeyDate[] = dates.slice(0, 4).map((d, i) => ({
    label: d.hint ?? dateLabel(d.context, i === 0 ? 'Key date' : 'Date mentioned'),
    date: d.date,
  }));

  return {
    id: `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    summary,
    meaning,
    steps,
    keyDates,
    source: 'demo',
    at: Date.now(),
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Explain a letter. Tries the live Gemini endpoint first; falls back to
 * the on-device demo explainer (and says so) when it does not answer.
 */
export async function explainLetter(
  text: string,
  sender: string,
  title: string,
): Promise<Explanation> {
  const endpoint = `${API_BASE}/api/explain`;
  try {
    const res = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sender, title }),
      },
      12000,
    );
    if (res.ok) {
      const data = (await res.json()) as ExplainResponse;
      if (data.summary && data.meaning) {
        const steps: ActionStep[] = (data.steps ?? []).slice(0, 6).map((s, i) => ({
          id: `step-${i + 1}`,
          text: String(s.text ?? '').slice(0, 200),
          deadline: s.deadline ?? null,
          done: false,
        }));
        const keyDates: KeyDate[] = (data.keyDates ?? []).slice(0, 4).map((k) => ({
          label: String(k.label ?? 'Key date').slice(0, 40),
          date: String(k.date ?? '').slice(0, 10),
        }));
        return {
          id: `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          summary: String(data.summary).slice(0, 600),
          meaning: String(data.meaning).slice(0, 600),
          steps: steps.length > 0 ? steps : demoExplain(text, sender, title).steps,
          keyDates,
          source: 'live',
          at: Date.now(),
        };
      }
    }
  } catch {
    // Endpoint not reachable — demo mode below.
  }
  return demoExplain(text, sender, title);
}

/* ------------------------------------------------------------------ */
/* Built-in sample letters — real official-letter text, written for   */
/* the app, so anyone can try an explanation without pasting one.      */
/* ------------------------------------------------------------------ */

export interface SampleLetter {
  id: string;
  sender: string;
  title: string;
  category: LetterCategory;
  text: string;
}

export const SAMPLE_LETTERS: SampleLetter[] = [
  {
    id: 'sample-council-tax',
    sender: 'Riverton Borough Council',
    title: 'Council Tax Bill 2026 to 2027',
    category: 'council',
    text: `Riverton Borough Council — Council Tax Bill for 2026 to 2027

Dear Resident,

Your Council Tax for the year 1 April 2026 to 31 March 2027 is £1,842.00. This is £96.00 more than last year because the council has increased its share by 4.99 percent and the police precept has risen.

You must pay £1,842.00 in 10 monthly instalments of £184.20. Your first payment is due on 1 April 2027. Payments are due on the 1st of each month. You can pay by Direct Debit, online, or by phone on 01234 567 890.

If you pay late, you may lose the right to pay in instalments and the full balance becomes due at once. If you think the bill is wrong, you can appeal to the Valuation Tribunal, but you must appeal within 2 months of the date of this letter, which is 18 November 2026. You still have to pay while your appeal is being looked at.

If you are on a low income, you may be able to claim Council Tax Reduction. Contact the council on 01234 567 890 or visit the council offices.`,
  },
  {
    id: 'sample-utility',
    sender: 'Northgate Energy',
    title: 'Your tariff is changing',
    category: 'utility',
    text: `Northgate Energy — Your tariff is changing

Dear Customer,

Your fixed tariff ends on 31 January 2027. From 1 February 2027 you will move to our standard variable tariff unless you choose a new fixed deal.

Your new prices from 1 February 2027 are 34.20p per unit of electricity and 7.80p per unit of gas, with a standing charge of 52.10p per day. Based on your current use, your yearly cost will increase by about £214.00 to £1,986.00.

You do not need to do anything if you are happy to move to the standard variable tariff. If you want to switch to a different tariff, or to a different supplier, you can do so before 31 January 2027 and there is no exit fee. If you switch after that date, the variable prices above will apply until your switch completes.

If you are struggling to pay, please call us on 0800 123 4567. We can talk about payment plans and support that may be available to you.`,
  },
  {
    id: 'sample-benefits',
    sender: 'Department for Work & Pensions',
    title: 'Your appointment at the Jobcentre',
    category: 'benefits',
    text: `Department for Work & Pensions — Your appointment

Dear Ms Carter,

You have an appointment at Riverton Jobcentre on 24 November 2026 at 10:30am. You must attend this appointment. It is to talk about your claim and the steps you are taking to look for work.

Please bring photo ID, such as a passport or driving licence, and your last two bank statements. If you cannot attend, you must contact us on 0800 169 0310 before 24 November 2026 to rearrange. If you miss the appointment and do not contact us, your payments may be affected.

The Jobcentre is at 14 Market Square, Riverton, RV1 2AB. Allow extra time to arrive, as you may need to wait. If you need an interpreter, or help because of a health condition, please call us before the appointment.`,
  },
];
