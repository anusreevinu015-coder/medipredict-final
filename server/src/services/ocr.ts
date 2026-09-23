import fs from 'node:fs';
import crypto from 'node:crypto';
import { createWorker } from 'tesseract.js';
import pdf from 'pdf-parse';
import type { ExtractedItem, ExtractionIndicator, ExtractionQuality } from '../types/auth.js';

export interface ReportAnalysis {
  quality: ExtractionQuality;
  text: string;
  items: ExtractedItem[];
  reportDate: string | null;
  diagnoses: string[];
  medicines: string[];
  notes: string | null;
}

const PDF_MIME = new Set(['application/pdf']);
const IMAGE_MIME = new Set(['image/jpeg', 'image/pjpeg', 'image/png']);

const LOW_READABILITY_NOTE =
  'We could not reliably read the medical values from this upload. Please re-upload a clearer ' +
  'scan or photo of the report. Do not guess values — the AI will not use unconfirmed data.';

async function extractPdfText(filePath: string): Promise<string | null> {
  const buffer = await fs.promises.readFile(filePath);

  try {
    const result = await pdf(buffer);
    return result.text;
  } catch {
    return null;
  }
}

async function extractImageText(filePath: string): Promise<string | null> {
  const worker = await createWorker('eng');
  try {
    const buffer = await fs.promises.readFile(filePath);
    const { data } = await worker.recognize(buffer);
    return data.text;
  } catch {
    return null;
  } finally {
    await worker.terminate();
  }
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[‐–—]/g, '-')
    .replace(/[↑⇧]/g, 'HIGH')
    .replace(/[↓⇩]/g, 'LOW')
    .replace(/[µ]/g, 'u')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

const NON_LAB_LINE = /^\s*(page|date|time|patient|name|date of birth|dob|gender|sex|age|doctor|physician|reference|range|collected|received|reported|specimen|sample|unit|result|test name|order no|accession|hospital|clinic|lab|address|phone|fax|email|notes|values|abnormal|flags?)\b/i;

function isLabFlagToken(token: string): boolean {
  return /^(H|L|HIGH|LOW|ABNORMAL|\*+|HN|LN)$/i.test(token);
}

function tokenize(line: string): string[] {
  return line
    .replace(/[\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length > 0);
}

function parseRange(tokens: string[], start: number): { value: string; next: number } | null {
  let i = start;
  const t = tokens[i];
  if (t === undefined) return null;

  const combined =
    /^[<>=]?\d+(?:[.,]\d+)?\s*-\s*[<>]?\d+(?:[.,]\d+)?$/.test(t) ||
    /^[<>=]?\d+(?:[.,]\d+)?$/.test(t);
  if (combined) {
    const next = i + 1;
    let value = t;
    // Optional unit glued after the range, e.g. "12.0-16.0 g/dL".
    if (tokens[next] && /^[A-Za-z][A-Za-z0-9/%^²³₂]*$/.test(tokens[next]) && !isLabFlagToken(tokens[next])) {
      value += ` ${tokens[next]}`;
      return { value, next: next + 1 };
    }
    return { value, next };
  }

  if (/^(<=|>=|<|>)$/.test(t)) {
    const bound = tokens[i + 1];
    if (bound !== undefined && /^\d+(?:[.,]\d+)?$/.test(bound)) {
      return { value: `${t}${bound}`, next: i + 2 };
    }
    return null;
  }

  if (/^\d+(?:[.,]\d+)?$/.test(t) && tokens[i + 1] === '-') {
    const right = tokens[i + 2];
    if (right !== undefined && /^[<>]?\d+(?:[.,]\d+)?$/.test(right)) {
      return { value: `${t}-${right}`, next: i + 3 };
    }
    return { value: t, next: i + 1 };
  }

  return null;
}

function parseLabLine(line: string): Omit<ExtractedItem, 'id'> | null {
  if (line.length < 8 || line.length > 300) return null;
  if (!/\d/.test(line)) return null;
  if (NON_LAB_LINE.test(line)) return null;

  const tokens = tokenize(line);

  // Leading alphabetic tokens form the test name (may include digits and
  // symbols, e.g. "HbA1c", "25-OH Vitamin D", "B12", "LDL Cholesterol").
  const leading: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[<>=]?\d+/.test(t)) break;
    if (isLabFlagToken(t) && i > 0) break;
    if (/^(g|mg|ug|ng|pg|m|u|mmol|umol|nmol|pmol|iu|l|dl|ml|cl|%|[kmu]?\/)/i.test(t) && i > 0 && leading.length > 0) {
      // unit-like token interrupting a name, e.g. value already seen -> stop
      break;
    }
    leading.push(t);
    i += 1;
  }

  const name = leading.join(' ').trim();
  if (name.length < 2 || name.length > 120) return null;

  // Value + maybe glued unit.
  const valueToken = tokens[i];
  if (valueToken === undefined || !/^[<>=]?\d+(?:[.,]\d+)?$/.test(valueToken)) return null;
  let value = valueToken;
  i += 1;

  // Unit may be glued to the value, e.g. "14.2g/dL" — split it off.
  const gluedSplit = valueToken.match(/^([<>=]?\d+(?:[.,]\d+)?)([A-Za-z][A-Za-z0-9/%^²³₂]*)$/);
  if (gluedSplit) {
    value = gluedSplit[1];
    tokens.splice(i, 0, gluedSplit[2]);
  }

  let unit = '';
  if (tokens[i] && /^[A-Za-z][A-Za-z0-9/%^²³₂]*$/.test(tokens[i]) && !isLabFlagToken(tokens[i])) {
    unit = tokens[i];
    i += 1;
  } else if (isLabFlagToken(tokens[i] ?? '')) {
    // no unit before flag
  }

  // Optional range.
  let reference = '';
  const range = parseRange(tokens, i);
  if (range) {
    reference = range.value;
    i = range.next;
  }

  // Optional trailing flag.
  let flag = '';
  if (tokens[i] && isLabFlagToken(tokens[i])) {
    flag = tokens[i];
  }

  // A line with leftover meaningful tokens still extracts what we could read.
  const indicator: ExtractionIndicator = /^L(?:OW)?$/i.test(flag) ? 'low' : /^H(?:IGH)?$/i.test(flag) ? 'high' : /ABNORMAL/i.test(flag) ? 'abnormal' : null;
  if (indicator === 'abnormal' && /^H(?:IGH)?$/i.test(flag)) {
    // reinforced above; keep as abnormal
  }

  return { testName: name, value, unit, reference, indicator };
}

const DIAGNOSIS_TERMS: [RegExp, string][] = [
  [/anemia|anaemia/i, 'Anemia'],
  [/diabetes\s*mellitus|type\s+2?\s*diabetes|hyperglycemia/i, 'Diabetes'],
  [/hypertension|high\s*blood\s*pressure/i, 'Hypertension'],
  [/hypothyroidism/i, 'Hypothyroidism'],
  [/hyperthyroidism/i, 'Hyperthyroidism'],
  [/hyperlipidemia|dyslipidemia|high\s*cholesterol/i, 'Hyperlipidemia'],
  [/infection\b/i, 'Infection'],
  [/urinary\s*tract\s*infection|\buti\b/i, 'Urinary tract infection'],
  [/pneumonia/i, 'Pneumonia'],
  [/bronchitis/i, 'Bronchitis'],
  [/asthma/i, 'Asthma'],
  [/copd|chronic\s*obstructive/i, 'COPD'],
  [/gastritis/i, 'Gastritis'],
  [/acid\s*reflux|gerd/i, 'Acid reflux (GERD)'],
  [/hepatitis/i, 'Hepatitis'],
  [/kidney\s*disease|renal\s*failure|ckd/i, 'Kidney disease'],
  [/hypokalemia|low\s*potassium/i, 'Hypokalemia'],
  [/hyperkalemia|high\s*potassium/i, 'Hyperkalemia'],
  [/hyponatremia/i, 'Hyponatremia'],
  [/dehydration/i, 'Dehydration'],
  [/iron\s*deficiency/i, 'Iron deficiency'],
  [/thyroiditis/i, 'Thyroiditis'],
  [/osteoarthritis|arthritis/i, 'Arthritis'],
  [/depression/i, 'Depression'],
  [/anxiety/i, 'Anxiety'],
  [/migraine/i, 'Migraine'],
];

const MEDICINE_TERMS: [RegExp, string][] = [
  [/metformin/i, 'Metformin'],
  [/atorvastatin/i, 'Atorvastatin'],
  [/simvastatin/i, 'Simvastatin'],
  [/rosuvastatin/i, 'Rosuvastatin'],
  [/amlodipine/i, 'Amlodipine'],
  [/lisinopril/i, 'Lisinopril'],
  [/losartan/i, 'Losartan'],
  [/metoprolol/i, 'Metoprolol'],
  [/amoxicillin/i, 'Amoxicillin'],
  [/azithromycin/i, 'Azithromycin'],
  [/ciprofloxacin/i, 'Ciprofloxacin'],
  [/omeprazole/i, 'Omeprazole'],
  [/pantoprazole/i, 'Pantoprazole'],
  [/levothyroxine/i, 'Levothyroxine'],
  [/prednisone/i, 'Prednisone'],
  [/ibuprofen/i, 'Ibuprofen'],
  [/acetaminophen|paracetamol/i, 'Paracetamol'],
  [/aspirin/i, 'Aspirin'],
  [/warfarin/i, 'Warfarin'],
  [/apixaban/i, 'Apixaban'],
  [/clopidogrel/i, 'Clopidogrel'],
  [/insulin/i, 'Insulin'],
  [/glipizide/i, 'Glipizide'],
  [/hydrochlorothiazide/i, 'Hydrochlorothiazide'],
  [/sertraline/i, 'Sertraline'],
  [/escitalopram/i, 'Escitalopram'],
  [/gabapentin/i, 'Gabapentin'],
  [/vitamin\s*b12|cyanocobalamin/i, 'Vitamin B12'],
  [/folic\s*acid/i, 'Folic acid'],
];

function matchKeywords(text: string, terms: [RegExp, string][]): string[] {
  const found = new Set<string>();
  for (const [pattern, label] of terms) {
    if (pattern.test(text)) found.add(label);
  }
  return Array.from(found).sort();
}

function parseReportDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2}|1[89]\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    const yyyy = Number(iso[1]);
    const mm = Number(iso[2]);
    const dd = Number(iso[3]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }
  const named = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/);
  if (named) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const mm = months.findIndex((m) => m.startsWith(named[2].toLowerCase())) + 1;
    if (mm >= 1) {
      return `${named[3]}-${String(mm).padStart(2, '0')}-${String(Number(named[1])).padStart(2, '0')}`;
    }
  }
  return null;
}

export async function analyzeReport(filePath: string, fileType: string): Promise<ReportAnalysis> {
  const mime = fileType.toLowerCase();

  let text: string | null = null;
  if (PDF_MIME.has(mime)) {
    text = await extractPdfText(filePath);
  } else if (IMAGE_MIME.has(mime)) {
    text = await extractImageText(filePath);
  }

  if (text === null || text.trim().length < 5) {
    return {
      quality: 'low',
      text: text ?? '',
      items: [],
      reportDate: null,
      diagnoses: [],
      medicines: [],
      notes: LOW_READABILITY_NOTE,
    };
  }

  const normalized = normalizeText(text);
  const items: Omit<ExtractedItem, 'id'>[] = [];
  for (const line of normalized.split('\n')) {
    const parsed = parseLabLine(line);
    if (parsed) items.push(parsed);
  }

  const dedicated = items.length > 0;
  const quality: ExtractionQuality = dedicated ? 'readable' : 'low';

  return {
    quality,
    text: normalized,
    items: items.map((item) => ({ id: crypto.randomUUID(), ...item })),
    reportDate: parseReportDate(normalized),
    diagnoses: matchKeywords(normalized, DIAGNOSIS_TERMS),
    medicines: matchKeywords(normalized, MEDICINE_TERMS),
    notes: dedicated
      ? null
      : LOW_READABILITY_NOTE,
  };
}