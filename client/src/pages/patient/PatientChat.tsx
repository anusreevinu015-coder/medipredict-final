import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chatApi } from '../../api/chat';
import { useAuth } from '../../context/AuthContext';
import type { ChatMessage } from '../../types/auth';
import type { HealthAssessment } from '../../types/assistant';

const EMERGENCY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /severe chest pain|chest pressure|crushing chest pain|chest pain/i, label: 'severe chest pain' },
  { pattern: /difficulty breathing|trouble breathing|can'?t breathe|cannot breathe|shortness of breath/i, label: 'difficulty breathing' },
  { pattern: /passed out|blacked out|fainted|unconscious|unresponsive/i, label: 'unconsciousness' },
  { pattern: /severe bleeding|uncontrollable bleeding|heavy bleeding/i, label: 'severe bleeding' },
  { pattern: /slurred speech|sudden weakness|numbness in (the )?(arm|leg|face)|drooping face/i, label: 'possible stroke signs' },
];

function detectEmergency(text: string): string | null {
  for (const item of EMERGENCY_PATTERNS) {
    if (item.pattern.test(text)) return item.label;
  }
  return null;
}

const DISCLAIMER =
  'This assistant provides AI-assisted health information for educational purposes only. It cannot ' +
  'diagnose you and is not a substitute for professional medical care.';

const WELCOME_MESSAGE =
  'Hello, I am your Medipredict health assistant. I can’t diagnose you, but I can help you think ' +
  'about your symptoms. Describe how you have been feeling and I will ask a few follow-up questions.';

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function PatientChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [emergency, setEmergency] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<HealthAssessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessmentNotice, setAssessmentNotice] = useState<string | null>(null);

  const windowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const patientMessageCount = messages.filter((m) => m.role === 'patient').length;
  const canAssess = patientMessageCount >= 2 && !assessment && !assessmentLoading;

  const lastAssistantId = emergency
    ? [...messages].reverse().find((m) => m.role === 'assistant')?.id
    : undefined;

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { messages: history } = await chatApi.getMessages();
      setMessages(history);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load your conversation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const el = windowRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      userId: user?.id ?? '',
      role: 'patient',
      content,
      createdAt: new Date().toISOString(),
    };

    setInput('');
    setSendError(null);
    setEmergency(null);
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const { messages: updated } = await chatApi.sendMessage({ content });
      setMessages(updated);
      const urgent = detectEmergency(content);
      if (urgent) setEmergency(urgent);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setSendError(err instanceof Error ? err.message : 'Failed to send your message. Please try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleAssessment = async () => {
    setAssessmentLoading(true);
    setAssessmentError(null);
    setAssessmentNotice(null);
    try {
      const result = await chatApi.generateAssessment();
      setMessages(result.messages);
      if (result.ready && result.assessment) {
        setAssessment(result.assessment);
        if (result.emergency) setEmergency('symptoms that need urgent review');
      } else if (result.message) {
        setAssessmentNotice(result.message);
      }
    } catch (err) {
      setAssessmentError(
        err instanceof Error ? err.message : 'Failed to prepare an assessment. Please try again.',
      );
    } finally {
      setAssessmentLoading(false);
    }
  };

  const goToHospitals = () => {
    if (!assessment) return;
    navigate(`/patient/hospitals?specialty=${encodeURIComponent(assessment.specialty)}`);
  };

  if (loading) {
    return (
      <div className="center-screen" role="status" aria-label="Loading chat">
        <div className="spinner" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>AI Health Assistant</h1>
          <div className="alert alert-error">{loadError}</div>
          <button type="button" className="btn btn-primary btn-block" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-card">
        <div className="chat-header">
          <h1>AI Health Assistant</h1>
          <p className="muted">Share your symptoms and I’ll ask a few follow-up questions.</p>
        </div>

        <div className="chat-disclaimer" role="note" data-testid="chat-disclaimer">
          {DISCLAIMER}
        </div>

        <div className="chat-window" ref={windowRef} data-testid="chat-window">
          {messages.length === 0 && (
            <div className="bubble bubble-assistant">
              <span className="bubble-sender">Assistant</span>
              <div className="bubble-text">{WELCOME_MESSAGE}</div>
            </div>
          )}
          {messages.map((item) => (
            <div
              key={item.id}
              className={
                `bubble ${item.role === 'patient' ? 'bubble-patient' : 'bubble-assistant'}` +
                (item.role === 'assistant' && item.id === lastAssistantId ? ' bubble-emergency' : '')
              }
              data-testid={`chat-message-${item.role}`}
            >
              <span className="bubble-sender">{item.role === 'patient' ? 'You' : 'Assistant'}</span>
              <div className="bubble-text">{item.content}</div>
              <span className="bubble-time muted">{formatTime(item.createdAt)}</span>
            </div>
          ))}
          {sending && (
            <div className="bubble bubble-assistant" role="status" aria-label="Assistant is typing">
              <span className="bubble-sender">Assistant</span>
              <div className="typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {emergency && (
          <div className="alert alert-emergency" role="alert" data-testid="emergency-alert">
            <strong>Please seek emergency care right away.</strong> Your message mentioned things
            that may indicate a medical emergency ({emergency}). Do not wait for a reply — call your
            local emergency number or go to the nearest emergency department now.
          </div>
        )}
        {sendError && <div className="alert alert-error">{sendError}</div>}

        {assessmentNotice && (
          <div className="alert alert-info" role="status" data-testid="assessment-notice">
            {assessmentNotice}
          </div>
        )}
        {assessmentError && <div className="alert alert-error">{assessmentError}</div>}

        {canAssess && (
          <div className="chat-actions">
            <p className="muted muted-small">
              You have described your symptoms to the assistant. Generate a health assessment when
              you are ready.
            </p>
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={handleAssessment}
              disabled={assessmentLoading}
              data-testid="generate-assessment"
            >
              <span className="btn-icon" aria-hidden="true">?</span>
              {assessmentLoading ? 'Analysing your answers…' : 'Generate AI health assessment'}
            </button>
          </div>
        )}

        {assessment && (
          <div className="assessment-panel" data-testid="assessment-panel">
            <div className="assessment-head">
              <h2>AI-Assisted Health Assessment</h2>
              <span className="badge badge-amber">Draft — not a diagnosis</span>
            </div>

            <section className="assessment-section">
              <h3>Possible health concerns</h3>
              <ul>
                {assessment.concerns.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="assessment-section">
              <h3>Important symptoms / findings</h3>
              <ul>
                {assessment.findings.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="assessment-section">
              <h3>Recommended specialty / department</h3>
              <p className="assessment-specialty">{assessment.specialty}</p>
            </section>

            <section className="assessment-section">
              <h3>Suggested next steps</h3>
              <ol>
                {assessment.nextSteps.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </section>

            <div className="chat-disclaimer" role="note">
              {DISCLAIMER}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block btn-lg"
              onClick={goToHospitals}
              data-testid="find-hospitals"
            >
              Find Recommended Hospitals
            </button>
            <p className="muted muted-small assessment-hint">
              Hospitals will be matched to the recommended specialty: {assessment.specialty}.
            </p>
          </div>
        )}

        <form className="chat-form" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms, e.g. I’ve had a sharp pain in my chest since this morning…"
            rows={3}
            maxLength={2000}
            disabled={sending}
            data-testid="chat-input"
          />
          <div className="chat-form-row">
            <span className="muted muted-small">{input.length}/2000</span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || input.trim().length === 0}
              data-testid="chat-send"
            >
              {sending ? 'Thinking…' : 'Send'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <Link to="/patient" className="link">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}