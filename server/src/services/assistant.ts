import type { ChatMessage, Report } from '../types/auth.js';

export interface HealthAssessment {
  concerns: string[];
  findings: string[];
  specialty: string;
  nextSteps: string[];
}

export interface AssessmentResult {
  /** True when enough information was available to produce an assessment. */
  ready: boolean;
  emergency: boolean;
  assessment: HealthAssessment | null;
  /** Text that can be persisted to the chat history (used when ready). */
  content: string;
}

/**
 * AI assistant provider contract.
 *
 * Stage 2 ships a simple rule-based MOCK implementation so the chat workflow
 * (persistence, UI, auth) can be built and tested end-to-end. When OpenAI is
 * integrated later, a new provider implementing this interface can replace
 * `assistant` below without touching routes, controllers or the client.
 *
 * `confirmedReports` are the patient's reports whose extracted values were
 * manually reviewed and confirmed. Only these may be considered by the AI.
 */
export interface AssistantProvider {
  reply(input: {
    userMessage: string;
    patientName: string;
    recentMessages: ChatMessage[];
    confirmedReports: Report[];
  }): Promise<{ content: string; emergency: boolean }>;
  assess(input: {
    patientName: string;
    recentMessages: ChatMessage[];
    confirmedReports: Report[];
  }): Promise<AssessmentResult>;
}

const EMERGENCY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bsevere\s+chest\s+pain\b/i, label: 'severe chest pain' },
  { pattern: /\bchest\s+pain\b/i, label: 'chest pain' },
  { pattern: /(?:can'?t|difficulty|trouble|hard)\s+breath/i, label: 'difficulty breathing' },
  { pattern: /\b(unconscious|passed\s+out|unresponsive)\b/i, label: 'unconsciousness' },
  { pattern: /\bsevere\s+bleeding\b/i, label: 'severe bleeding' },
];

const FOLLOW_UP_QUESTIONS = [
  'When did these symptoms first start, and how long have they been going on?',
  'On a scale of 1 to 10, how severe are the symptoms right now?',
  'Do you have any existing medical conditions that might be related?',
  'Are you currently taking any medications for this or anything else?',
  'Do you have any known allergies, especially to medications?',
];

// Keyword -> specialty mapping used by the mock assessor. Order matters: the
// first specialty with a match wins. These names intentionally match the
// seeded hospital department names.
const SYMPTOM_SPECIALTIES: { specialty: string; keywords: string[]; labels: string[] }[] = [
  {
    specialty: 'Cardiology',
    keywords: ['chest pain', 'chest pressure', 'chest tightness', 'palpitations', 'racing heart', 'heart racing', 'fluttering', 'irregular heartbeat', 'heart discomfort'],
    labels: ['chest pain or pressure', 'palpitations or racing heart'],
  },
  {
    specialty: 'Neurology',
    keywords: ['headache', 'migraine', 'dizzy', 'dizziness', 'vertigo', 'numbness', 'tingling', 'tremor', 'shaking', 'seizure', 'balance'],
    labels: ['headache or migraine', 'dizziness or vertigo', 'numbness or tingling', 'tremor or seizure'],
  },
  {
    specialty: 'Pulmonology',
    keywords: ['cough', 'wheezing', 'wheeze', 'phlegm', 'sputum', 'asthma', 'bronchitis', 'breathless', 'breathlessness', 'persistent cough'],
    labels: ['cough or wheezing', 'asthma or bronchitis', 'breathlessness'],
  },
  {
    specialty: 'Gastroenterology',
    keywords: ['stomach', 'abdominal', 'belly', 'nausea', 'vomit', 'vomiting', 'diarrhea', 'diarrhoea', 'constipation', 'reflux', 'heartburn', 'indigestion', 'bloating', 'appetite'],
    labels: ['stomach or abdominal symptoms', 'nausea or vomiting', 'diarrhea or constipation', 'reflux or indigestion'],
  },
  {
    specialty: 'Orthopedics',
    keywords: ['back pain', 'joint pain', 'knee', 'shoulder pain', 'hip pain', 'muscle ache', 'sprain', 'fracture', 'arthritis', 'tendon', 'neck pain'],
    labels: ['back, joint or limb pain', 'sprain or fracture', 'arthritis symptoms'],
  },
  {
    specialty: 'Dermatology',
    keywords: ['rash', 'skin', 'itch', 'itching', 'acne', 'eczema', 'psoriasis', 'mole', 'hives', 'skin lesion', 'dry skin'],
    labels: ['rash or itching', 'skin lesions or hives'],
  },
  {
    specialty: 'Endocrinology',
    keywords: ['diabetes', 'blood sugar', 'thyroid', 'weight gain', 'weight loss', 'thirst', 'hormone', 'metabolic'],
    labels: ['diabetes or blood sugar symptoms', 'thyroid or hormone symptoms', 'unexplained weight change'],
  },
  {
    specialty: 'ENT',
    keywords: ['ear pain', 'earache', 'hearing', 'ringing in ears', 'sore throat', 'throat pain', 'sinus', 'congestion', 'voice', 'tonsil', 'nose'],
    labels: ['ear pain or hearing issues', 'sore throat or sinus issues'],
  },
  {
    specialty: 'Urology',
    keywords: ['urinary', 'urine', 'urination', 'bladder', 'kidney stone', 'prostate', 'burning'],
    labels: ['urinary symptoms', 'bladder or kidney concerns'],
  },
  {
    specialty: 'Gynecology',
    keywords: ['menstrual', 'period pain', 'irregular periods', 'pelvic', 'pregnancy', 'breast', 'vaginal'],
    labels: ['menstrual or pelvic symptoms', 'pregnancy or breast concerns'],
  },
  {
    specialty: 'Ophthalmology',
    keywords: ['eye pain', 'blurred vision', 'blurry vision', 'blurry', 'double vision', 'vision loss', 'red eye', 'eye strain'],
    labels: ['eye pain or redness', 'vision changes'],
  },
  {
    specialty: 'Psychiatry',
    keywords: ['anxiety', 'depression', 'stress', 'panic', 'mood', 'insomnia', 'sleep problems', 'panic attack', 'overwhelming'],
    labels: ['anxiety or panic', 'low mood or depression', 'sleep problems or stress'],
  },
  {
    specialty: 'General Medicine',
    keywords: ['fever', 'chills', 'fatigue', 'tiredness', 'weakness', 'malaise', 'aches'],
    labels: ['fever or chills', 'fatigue or general weakness'],
  },
];

function detectEmergency(text: string): string | null {
  for (const item of EMERGENCY_PATTERNS) {
    if (item.pattern.test(text)) return item.label;
  }
  return null;
}

function patientMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.role === 'patient');
}

function patientMessageCount(messages: ChatMessage[]): number {
  return patientMessages(messages).length;
}

interface SymptomMatch {
  specialty: string;
  labels: string[];
}

function detectSymptoms(messages: ChatMessage[]): SymptomMatch | null {
  const text = messages.map((m) => m.content).join('\n').toLowerCase();
  for (const item of SYMPTOM_SPECIALTIES) {
    const foundAll = item.keywords.some((k) => text.includes(k));
    if (!foundAll) continue;
    const matchedLabels = item.labels.filter((label) =>
      item.keywords.some((k) => label.toLowerCase().includes(k.slice(0, 8)) && text.includes(k)),
    );
    const labels = matchedLabels.length > 0 ? matchedLabels : item.labels.slice(0, 2);
    return { specialty: item.specialty, labels };
  }
  return null;
}

const DISCLAIMER_LINE =
  'This is an AI-assisted health assessment for educational purposes only. It is not a diagnosis ' +
  'and is not a substitute for professional medical care.';

function buildReadyAssessment(
  patientName: string,
  match: SymptomMatch,
  emergency: string | null,
  answersCount: number,
  confirmedReports: Report[],
): AssessmentResult {
  const flagged = flaggedReportFindings(confirmedReports);
  const considered = reportConsideredLines(confirmedReports);

  const concerns = [
    `Possible health concern related to the ${match.specialty.toLowerCase()} specialty based on what you described (${match.labels.join('; ')}).`,
    'These symptoms may or may not indicate a medical condition — this is not a diagnosis.',
  ];
  if (flagged.length > 0) {
    concerns.push(
      'Your confirmed report data shows one or more values outside the reference range. That is a signal worth discussing with a doctor; it is not itself a diagnosis.',
    );
  }

  const nextSteps: string[] = [];
  if (emergency) {
    nextSteps.push(
      `Seek emergency care right away for the serious symptoms you mentioned (${emergency}). Do not wait for an online response.`,
    );
  }
  nextSteps.push(
    `Book a consultation with a ${match.specialty} specialist to review your symptoms in person.`,
  );
  if (flagged.length > 0) {
    nextSteps.push(
      'Take your confirmed report with you to the appointment so the doctor can review the flagged values.',
    );
  }
  nextSteps.push(
    'Keep a simple record of when the symptoms started, how severe they get, and any triggers.',
  );
  if (answersCount < 3) {
    nextSteps.push(
      'At your visit, be ready to describe how long you have had the symptoms, their severity, your medical history, medications, and allergies.',
    );
  }
  nextSteps.push('Do not start, stop, or change any treatment without consulting a doctor.');
  nextSteps.push('If symptoms worsen or new red-flag symptoms appear, seek emergency care.');

  const findings = [...match.labels];
  for (const line of flagged) {
    findings.push(`Confirmed report: ${line}.`);
  }

  const assessment: HealthAssessment = {
    concerns,
    findings,
    specialty: match.specialty,
    nextSteps,
  };

  const sections = [
    `Thanks, ${patientName}. Based on our conversation, here is your AI-assisted health assessment.`,
    '',
    'Possible health concerns:',
    ...concerns.map((c) => `  - ${c}`),
    '',
    'Important symptoms / findings:',
    ...findings.map((l) => `  - ${l}`),
    '',
    `Recommended specialty / department: ${match.specialty}`,
  ];
  if (considered.length > 0) {
    sections.push('', 'Confirmed report information considered in this assessment:');
    sections.push(...considered.map((l) => `  - ${l}`));
  }
  sections.push('', 'Suggested next steps:', ...nextSteps.map((s) => `  - ${s}`), '', DISCLAIMER_LINE);

  return { ready: true, emergency: Boolean(emergency), assessment, content: sections.join('\n') };
}

function flaggedReportFindings(reports: Report[]): string[] {
  return reports.flatMap((r) =>
    r.extraction.items
      .filter((i) => i.indicator === 'high' || i.indicator === 'low' || i.indicator === 'abnormal')
      .map((i) => {
        const parts = [
          `${i.testName} ${i.value || 'n/a'}${i.unit ? ' ' + i.unit : ''}`,
          i.reference ? `ref ${i.reference}` : '',
          `flagged ${i.indicator}`,
        ];
        return parts.filter(Boolean).join(', ');
      }),
  );
}

const TEST_SPECIALTY_MAP: { test: string; specialty: string; label: string }[] = [
  { test: 'glucose', specialty: 'Endocrinology', label: 'blood sugar results' },
  { test: 'a1c', specialty: 'Endocrinology', label: 'long-term blood sugar control (HbA1c)' },
  { test: 'insulin', specialty: 'Endocrinology', label: 'insulin-related results' },
  { test: 'tsh', specialty: 'Endocrinology', label: 'thyroid stimulating hormone' },
  { test: 'thyroid', specialty: 'Endocrinology', label: 'thyroid hormone results' },
  { test: 'cholesterol', specialty: 'Cardiology', label: 'cholesterol results' },
  { test: 'ldl', specialty: 'Cardiology', label: 'LDL cholesterol results' },
  { test: 'hdl', specialty: 'Cardiology', label: 'HDL cholesterol results' },
  { test: 'triglyceride', specialty: 'Cardiology', label: 'triglyceride results' },
  { test: 'troponin', specialty: 'Cardiology', label: 'cardiac marker results' },
  { test: 'creatinine', specialty: 'General Medicine', label: 'kidney function results' },
  { test: 'urea', specialty: 'General Medicine', label: 'kidney function results' },
  { test: 'gfr', specialty: 'General Medicine', label: 'kidney function results' },
  { test: 'bilirubin', specialty: 'Gastroenterology', label: 'liver function results' },
  { test: 'alt', specialty: 'Gastroenterology', label: 'liver function results' },
  { test: 'ast', specialty: 'Gastroenterology', label: 'liver function results' },
  { test: 'ggt', specialty: 'Gastroenterology', label: 'liver function results' },
  { test: 'amylase', specialty: 'Gastroenterology', label: 'pancreatic enzyme results' },
  { test: 'lipase', specialty: 'Gastroenterology', label: 'pancreatic enzyme results' },
  { test: 'pco2', specialty: 'Pulmonology', label: 'blood gas results' },
  { test: 'po2', specialty: 'Pulmonology', label: 'blood gas results' },
  { test: 'hemoglobin', specialty: 'General Medicine', label: 'blood count results' },
  { test: 'hematocrit', specialty: 'General Medicine', label: 'blood count results' },
  { test: 'rbc', specialty: 'General Medicine', label: 'blood count results' },
  { test: 'wbc', specialty: 'General Medicine', label: 'blood count results' },
  { test: 'platelet', specialty: 'General Medicine', label: 'blood count results' },
];

function specialtyFromReports(reports: Report[]): SymptomMatch | null {
  for (const item of TEST_SPECIALTY_MAP) {
    const found = reports.some((r) =>
      r.extraction.items.some((i) => i.testName.toLowerCase().includes(item.test)),
    );
    if (found) return { specialty: item.specialty, labels: [item.label] };
  }
  return null;
}

function reportConsideredLines(reports: Report[]): string[] {
  const lines: string[] = [];
  for (const report of reports) {
    const flagged = report.extraction.items
      .filter((i) => i.indicator === 'high' || i.indicator === 'low' || i.indicator === 'abnormal')
      .map((i) => `${i.testName} ${i.value || 'n/a'}${i.unit ? ' ' + i.unit : ''}` + (i.reference ? ` (ref ${i.reference})` : ''));
    if (flagged.length > 0) {
      lines.push(`Report "${report.originalFilename}": ${flagged.join('; ')} (flagged out of range).`);
      continue;
    }
    const parts: string[] = [];
    if (report.extraction.diagnoses.length > 0) parts.push(`diagnoses mentioned: ${report.extraction.diagnoses.join(', ')}`);
    if (report.extraction.medicines.length > 0) parts.push(`medicines mentioned: ${report.extraction.medicines.join(', ')}`);
    if (parts.length > 0) {
      lines.push(`Report "${report.originalFilename}": ${parts.join('; ')}.`);
    }
  }
  return lines;
}

export const mockAssistant: AssistantProvider = {
  async reply({ userMessage, patientName, recentMessages, confirmedReports }) {
    const emergency = detectEmergency(userMessage);

    if (emergency) {
      return {
        content:
          `Thank you for telling me, ${patientName}. What you described (${emergency}) can be serious. ` +
          `Please seek emergency medical care right away by calling your local emergency number or going to the nearest emergency department. ` +
          `Do not wait for an online response. This is a general safety warning and not a diagnosis.`,
        emergency: true,
      };
    }

    const asked = patientMessageCount(recentMessages);
    const question = FOLLOW_UP_QUESTIONS[(asked - 1) % FOLLOW_UP_QUESTIONS.length];

    const reportNote =
      confirmedReports.length > 0
        ? ` Also, I have your confirmed report data available and will consider it when I prepare your assessment.`
        : '';

    return {
      content:
        `Thanks, ${patientName}. I've noted what you said. To help you further I'd like to understand a few more things. ` +
        `Could you tell me: ${question} ` +
        `(I can only offer general health information, not a diagnosis.)${reportNote}`,
      emergency: false,
    };
  },

  async assess({ patientName, recentMessages, confirmedReports }) {
    const patientMsgs = patientMessages(recentMessages);
    const answersCount = patientMsgs.length;

    // Not enough turns yet -> keep asking follow-up questions instead of
    // producing an assessment.
    if (answersCount < 3) {
      const nextQuestion =
        FOLLOW_UP_QUESTIONS[Math.min(answersCount, FOLLOW_UP_QUESTIONS.length - 1)];
      return {
        ready: false,
        emergency: false,
        assessment: null,
        content:
          `I don't have enough information yet to prepare a health assessment, ${patientName}. ` +
          `Please answer a few follow-up questions first so I can understand your situation better: ` +
          `symptoms, how long they have lasted, how severe they are, your medical history, ` +
          `current medications, and any allergies. Next question: ${nextQuestion}`,
      };
    }

    const emergencyText = patientMsgs
      .map((m) => detectEmergency(m.content))
      .find((label): label is string => label !== null);

    let match = detectSymptoms(patientMsgs);
    if (!match) {
      match = specialtyFromReports(confirmedReports);
    }
    if (!match) {
      match = { specialty: 'General Medicine', labels: ['non-specific or general symptoms'] };
    }

    return buildReadyAssessment(patientName, match, emergencyText ?? null, answersCount, confirmedReports);
  },
};

/** Active assistant provider. Swap this const to integrate OpenAI later. */
export const assistant: AssistantProvider = mockAssistant;