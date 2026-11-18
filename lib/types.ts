/** CivicHelper shared types. Dates are 'YYYY-MM-DD' strings. */

export type LetterCategory =
  | 'council'
  | 'utility'
  | 'benefits'
  | 'bank'
  | 'health'
  | 'other';

export const CATEGORY_LABELS: Record<LetterCategory, string> = {
  council: 'Council & tax',
  utility: 'Utility & bills',
  benefits: 'Benefits & appointments',
  bank: 'Bank & money',
  health: 'Health & care',
  other: 'Other official mail',
};

export type Urgency = 'urgent' | 'soon' | 'none';

export interface ActionStep {
  id: string;
  text: string;
  /** 'YYYY-MM-DD' when the letter gives a deadline for this step. */
  deadline?: string | null;
  done: boolean;
}

export interface KeyDate {
  label: string;
  /** 'YYYY-MM-DD'. */
  date: string;
}

export type ExplainSource = 'live' | 'demo';

export interface Explanation {
  id: string;
  /** One or two plain sentences: what the letter says. */
  summary: string;
  /** What it means for the person who got it. */
  meaning: string;
  steps: ActionStep[];
  keyDates: KeyDate[];
  source: ExplainSource;
  /** Epoch milliseconds the explanation was made. */
  at: number;
}

export interface Letter {
  id: string;
  sender: string;
  title: string;
  category: LetterCategory;
  /** The letter's own text, as pasted or sampled. */
  originalText: string;
  /** Epoch milliseconds the letter was added. */
  receivedAt: number;
  /** 'YYYY-MM-DD' of the soonest deadline, when known. */
  dueDate?: string | null;
  explanation: Explanation | null;
  /** True once every action step is done (or the user marks it done). */
  done: boolean;
  /** Seeded demo content — clearable from Settings. */
  isDemo?: boolean;
}

export interface HistoryEntry {
  id: string;
  letterId: string;
  title: string;
  sender: string;
  /** Epoch milliseconds the letter was explained. */
  at: number;
}

export interface ExplainRequest {
  text: string;
  sender?: string;
  title?: string;
}

export interface ExplainResponse {
  summary?: string;
  meaning?: string;
  steps?: { text: string; deadline?: string | null }[];
  keyDates?: { label: string; date: string }[];
  error?: { message?: string };
}
