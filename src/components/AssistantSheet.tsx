import { IonContent, IonFooter, IonHeader, IonIcon, IonModal, IonToolbar } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { addOutline, checkmarkOutline, closeOutline, sendOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { addTask, getCategories, getPlan, getProjects } from '../services/storage';
import {
  askAssistant,
  setPlan,
  AssistantError,
  type AskQuestion,
  type AssistantContext,
  type ChatMessage,
  type DraftTask,
} from '../services/assistant';
import { assignQuadrant } from '../utils/scheduler';
import WellBotIcon from './WellBotIcon';
import type { CategoryDef, Plan, Priority, Project, Task } from '../types';

/** What the user has picked / typed for one question. */
interface Answer {
  picks: string[];
  typed: string;
}

type Turn =
  | { from: 'user'; text: string }
  | { from: 'ask'; questions: AskQuestion[]; answers: Record<string, Answer>; submitted: boolean }
  | { from: 'draft'; draft: DraftTask; created?: boolean };

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const MAX_INPUT_HEIGHT = 120; // px; longer messages scroll inside the box
const EXAMPLES = ['Math exam', 'Group presentation', 'Laundry and groceries'];

const ERROR_TEXT: Record<string, string> = {
  plus_required: 'WellBot is part of WellSync Plus.',
  unavailable: 'WellBot is only available on the deployed app (or with `vercel dev`), not the plain dev server.',
  assistant_not_configured: 'WellBot is not set up on the server yet.',
};

const answerText = (a?: Answer) => a?.typed.trim() || a?.picks.join(', ') || '';

/**
 * WellBot, the WellSync Plus task assistant: a short chat that ends in an
 * editable task preview. Questions come as one set that is answered together,
 * and nothing is saved until "Create task". Free accounts see a demo paywall
 * instead; the server enforces the same check.
 */
export default function AssistantSheet({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [plan, setPlanState] = useState<Plan | null>(null);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTurns([]);
    setInput('');
    setError('');
    setPlanState(null);
    getPlan().then(setPlanState).catch(() => setPlanState('free'));
    getCategories().then(setCategories).catch(() => undefined);
    getProjects().then(setProjects).catch(() => undefined);
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, busy]);

  // Grow with the text up to MAX_INPUT_HEIGHT, then scroll inside the box.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [input, plan]);

  function toMessage(t: Turn): ChatMessage | null {
    if (t.from === 'user') return { role: 'user', content: t.text };
    if (t.from === 'ask') return { role: 'assistant', content: t.questions.map((q) => q.question).join('\n') };
    return null;
  }

  async function send(text: string, history: Turn[]) {
    const next: Turn[] = [...history, { from: 'user', text }];
    setTurns(next);
    setInput('');
    setError('');
    setBusy(true);
    const context: AssistantContext = {
      today: format(new Date(), 'yyyy-MM-dd'),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    };
    try {
      const reply = await askAssistant(
        next.map(toMessage).filter((m): m is ChatMessage => !!m),
        context
      );
      setTurns((prev) => [
        ...prev,
        reply.kind === 'ask'
          ? { from: 'ask', questions: reply.questions, answers: {}, submitted: false }
          : { from: 'draft', draft: reply.task },
      ]);
    } catch (err) {
      const code = err instanceof AssistantError ? err.code : 'failed';
      if (code === 'plus_required') setPlanState('free');
      setError(ERROR_TEXT[code] ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const last = turns[turns.length - 1];
  const awaitingAnswers = last?.from === 'ask' && !last.submitted;

  function submitComposer() {
    const text = input.trim();
    if (!text || busy || awaitingAnswers) return;
    // A finished draft means the user is starting a new task.
    send(text, last?.from === 'draft' ? [] : turns);
  }

  function setAnswer(turnIndex: number, q: AskQuestion, patch: Partial<Answer>, toggle?: string) {
    setTurns((prev) =>
      prev.map((t, i) => {
        if (i !== turnIndex || t.from !== 'ask') return t;
        const cur = t.answers[q.id] ?? { picks: [], typed: '' };
        let picks = cur.picks;
        if (toggle !== undefined) {
          picks = q.multiSelect
            ? cur.picks.includes(toggle)
              ? cur.picks.filter((p) => p !== toggle)
              : [...cur.picks, toggle]
            : [toggle];
        }
        // Typing your own answer replaces the chip choice, and vice versa.
        const typed = toggle !== undefined ? '' : patch.typed ?? cur.typed;
        return { ...t, answers: { ...t.answers, [q.id]: { picks: patch.typed !== undefined ? [] : picks, typed } } };
      })
    );
  }

  function submitAnswers(turnIndex: number) {
    const t = turns[turnIndex];
    if (t.from !== 'ask') return;
    const text = t.questions.map((q) => `${q.question}: ${answerText(t.answers[q.id])}`).join('\n');
    send(text, turns.map((x, i) => (i === turnIndex && x.from === 'ask' ? { ...x, submitted: true } : x)));
  }

  async function changePlan(action: 'subscribe' | 'cancel') {
    setBusy(true);
    setError('');
    try {
      setPlanState(await setPlan(action));
    } catch (err) {
      setError(ERROR_TEXT[err instanceof AssistantError ? err.code : ''] ?? 'Could not update your plan. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(index: number, patch: Partial<DraftTask>) {
    setTurns((prev) => prev.map((t, i) => (i === index && t.from === 'draft' ? { ...t, draft: { ...t.draft, ...patch } } : t)));
  }

  async function create(index: number, draft: DraftTask) {
    const phases = draft.phases.map((p) => p.trim()).filter(Boolean).map((title) => ({ id: crypto.randomUUID(), title, done: false }));
    const task: Task = {
      id: crypto.randomUUID(),
      title: draft.title.trim() || 'Untitled task',
      description: draft.description,
      dueDate: draft.dueDate,
      priority: draft.priority,
      category: draft.categoryId,
      effortDays: draft.effortDays,
      quadrant: assignQuadrant(draft.priority, draft.dueDate),
      status: 'todo',
      tags: [],
      // Firestore rejects undefined, so unset fields are omitted.
      ...(draft.projectId ? { projectId: draft.projectId } : {}),
      createdAt: new Date().toISOString(),
      ...(phases.length ? { phases } : { manualProgress: 0 }),
    };
    setBusy(true);
    try {
      await addTask(task);
      setTurns((prev) => prev.map((t, i) => (i === index && t.from === 'draft' ? { ...t, created: true } : t)));
      onCreated?.();
    } catch {
      setError('Could not save the task. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const isPlus = plan === 'plus';
  const placeholder = awaitingAnswers ? 'Answer the questions above first' : 'Describe a task…';

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader className="ion-no-border ws-sheet-header">
        <IonToolbar>
          <div className="ws-sheet-bar">
            <button className="ws-icon-btn" aria-label="Close" onClick={onClose}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
            <h2>
              <WellBotIcon size={20} /> WellBot
            </h2>
            <span style={{ width: 44 }} />
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {plan === null && <p className="ws-fw-empty">Loading…</p>}

        {plan === 'free' && (
          <div className="ws-glass-card ws-plus">
            <span className="ws-plus__tag">Demo · no payment is taken</span>
            <h3>WellSync Plus</h3>
            <p className="ws-plus__price">
              ₱149<span>/month</span>
            </p>
            <ul className="ws-info-list">
              <li>Type a few words and get a complete task.</li>
              <li>WellBot asks a few quick questions when it needs more.</li>
              <li>Every task comes with suggested phases to tick off.</li>
            </ul>
            <button className="ws-button-block" disabled={busy} onClick={() => changePlan('subscribe')}>
              {busy ? 'Subscribing…' : 'Subscribe'}
            </button>
            {error && <p className="ws-error">{error}</p>}
          </div>
        )}

        {isPlus && (
          <div className="ws-chat">
            {turns.length === 0 && (
              <div className="ws-chat-intro">
                <span className="ws-chat-intro__icon">
                  <WellBotIcon size={30} />
                </span>
                <h3>What do you need to get done?</h3>
                <p>Describe it in a few words. WellBot may ask a couple of questions, then drafts the task and its steps for you.</p>
                <div className="ws-chat-intro__examples" role="group" aria-label="Examples">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="ws-filter-chip"
                      onClick={() => {
                        setInput(ex);
                        inputRef.current?.focus();
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <p className="ws-chat-intro__note">Suggestions are a starting point. Check them before you create the task.</p>
              </div>
            )}

            {turns.map((t, i) => {
              if (t.from === 'user')
                return (
                  <div key={i} className="ws-chat__bubble ws-chat__bubble--user">
                    {t.text}
                  </div>
                );

              if (t.from === 'ask') {
                const complete = t.questions.every((q) => answerText(t.answers[q.id]));
                return (
                  <div key={i} className="ws-chat__ai">
                    <div className="ws-chat__bubble">A few quick questions so I can build this properly:</div>
                    <div className={`ws-glass-card ws-ask${t.submitted ? ' is-submitted' : ''}`}>
                      {t.questions.map((q, qi) => {
                        const a = t.answers[q.id];
                        return (
                          <fieldset key={q.id} className="ws-ask__q" disabled={t.submitted || busy}>
                            <legend>
                              <span className="ws-ask__num">{qi + 1}</span>
                              {q.question}
                            </legend>
                            <div className="ws-ask__options">
                              {q.options.map((o) => {
                                const on = !!a?.picks.includes(o);
                                return (
                                  <button
                                    key={o}
                                    type="button"
                                    className={`ws-filter-chip${on ? ' is-active' : ''}`}
                                    aria-pressed={on}
                                    onClick={() => setAnswer(i, q, {}, o)}
                                  >
                                    {o}
                                  </button>
                                );
                              })}
                            </div>
                            <input
                              className="ws-ask__other"
                              placeholder={q.multiSelect ? 'Pick any, or type your own' : 'Or type your own answer'}
                              value={a?.typed ?? ''}
                              maxLength={80}
                              onChange={(e) => setAnswer(i, q, { typed: e.target.value })}
                            />
                          </fieldset>
                        );
                      })}
                      {!t.submitted && (
                        <button type="button" className="ws-button-block" disabled={!complete || busy} onClick={() => submitAnswers(i)}>
                          Continue
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const d = t.draft;
              return (
                <div key={i} className="ws-chat__ai">
                  <div className="ws-chat__bubble">Here&apos;s a draft. Change anything you like, then create it.</div>
                  <div className="ws-glass-card ws-draft">
                    <p className="ws-field-label">Suggested task</p>
                    <input className="ws-draft__title" value={d.title} disabled={t.created} onChange={(e) => updateDraft(i, { title: e.target.value })} aria-label="Title" />
                    <div className="ws-draft__row">
                      <label>
                        Due
                        <input type="date" value={d.dueDate} disabled={t.created} onChange={(e) => updateDraft(i, { dueDate: e.target.value })} />
                      </label>
                      <label>
                        Category
                        <select value={d.categoryId} disabled={t.created} onChange={(e) => updateDraft(i, { categoryId: e.target.value })}>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="ws-ask__options">
                      {PRIORITIES.map((p) => (
                        <button key={p} type="button" disabled={t.created} className={`ws-filter-chip${d.priority === p ? ' is-active' : ''}`} onClick={() => updateDraft(i, { priority: p })}>
                          {p[0].toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                      <span className="ws-fw-hint">
                        {d.effortDays} day{d.effortDays === 1 ? '' : 's'} of work
                      </span>
                    </div>
                    {d.projectId && <p className="ws-fw-hint">Project: {projects.find((p) => p.id === d.projectId)?.name}</p>}
                    <p className="ws-field-label" style={{ marginTop: 14 }}>
                      Phases
                    </p>
                    {d.phases.map((ph, pi) => (
                      <input
                        key={pi}
                        className="ws-draft__phase"
                        value={ph}
                        disabled={t.created}
                        aria-label={`Phase ${pi + 1}`}
                        onChange={(e) => updateDraft(i, { phases: d.phases.map((x, xi) => (xi === pi ? e.target.value : x)) })}
                      />
                    ))}
                    {!t.created && (
                      <button type="button" className="ws-draft__add" onClick={() => updateDraft(i, { phases: [...d.phases, ''] })}>
                        <IonIcon icon={addOutline} /> Add phase
                      </button>
                    )}
                    {t.created ? (
                      <p className="ws-draft__done">
                        <IonIcon icon={checkmarkOutline} /> Task created
                      </p>
                    ) : (
                      <button className="ws-button-block" style={{ marginTop: 14 }} disabled={busy || !d.title.trim()} onClick={() => create(i, d)}>
                        Create task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {busy && <div className="ws-chat__bubble ws-chat__bubble--typing">Thinking…</div>}
            {error && <p className="ws-error">{error}</p>}
            <div ref={endRef} />
          </div>
        )}
      </IonContent>

      {isPlus && (
        <IonFooter className="ion-no-border ws-sheet-footer">
          <IonToolbar>
            <form
              className="ws-composer"
              onSubmit={(e) => {
                e.preventDefault();
                submitComposer();
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                disabled={awaitingAnswers}
                placeholder={placeholder}
                aria-label="Describe a task"
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Desktop: Enter sends, Shift+Enter adds a line. Phones keep Enter as a new line.
                  if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) {
                    e.preventDefault();
                    submitComposer();
                  }
                }}
              />
              <button type="submit" className="ws-icon-btn ws-icon-btn--dark" aria-label="Send" disabled={!input.trim() || busy || awaitingAnswers}>
                <IonIcon icon={sendOutline} style={{ fontSize: 18 }} />
              </button>
            </form>
          </IonToolbar>
        </IonFooter>
      )}
    </IonModal>
  );
}
