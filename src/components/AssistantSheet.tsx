import { IonContent, IonIcon, IonModal } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { closeOutline, sendOutline, sparklesOutline, checkmarkOutline, addOutline } from 'ionicons/icons';
import { format } from 'date-fns';
import { addTask, getCategories, getPlan, getProjects } from '../services/storage';
import { askAssistant, setPlan, AssistantError, type AssistantContext, type ChatMessage, type DraftTask } from '../services/assistant';
import { assignQuadrant } from '../utils/scheduler';
import type { CategoryDef, Plan, Priority, Project, Task } from '../types';

type Turn =
  | { from: 'user'; text: string }
  | { from: 'ai'; text: string; options?: string[]; multiSelect?: boolean; answered?: boolean }
  | { from: 'ai-draft'; draft: DraftTask; created?: boolean };

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

const ERROR_TEXT: Record<string, string> = {
  plus_required: 'The assistant is part of WellSync Plus.',
  unavailable: 'The assistant is only available on the deployed app (or with `vercel dev`), not the plain dev server.',
  assistant_not_configured: 'The assistant is not set up on the server yet.',
};

/**
 * WellSync Plus task assistant: a short chat that ends in an editable task
 * preview. Nothing is saved until "Create task". Free accounts see a demo
 * paywall instead; the server enforces the same check.
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
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

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

  function describe(t: Turn): ChatMessage | null {
    if (t.from === 'user') return { role: 'user', content: t.text };
    if (t.from === 'ai') return { role: 'assistant', content: t.text };
    return null;
  }

  async function send(text: string, history: Turn[]) {
    const next: Turn[] = [...history, { from: 'user', text }];
    setTurns(next);
    setInput('');
    setPicked([]);
    setError('');
    setBusy(true);
    const context: AssistantContext = {
      today: format(new Date(), 'yyyy-MM-dd'),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
    };
    try {
      const reply = await askAssistant(
        next.map(describe).filter((m): m is ChatMessage => !!m),
        context
      );
      setTurns((prev) => [
        ...prev,
        reply.kind === 'ask'
          ? { from: 'ai', text: reply.question, options: reply.options, multiSelect: reply.multiSelect }
          : { from: 'ai-draft', draft: reply.task },
      ]);
    } catch (err) {
      const code = err instanceof AssistantError ? err.code : 'failed';
      if (code === 'plus_required') setPlanState('free');
      setError(ERROR_TEXT[code] ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function answer(index: number, text: string) {
    const history = turns.map((t, i) => (i === index && t.from === 'ai' ? { ...t, answered: true } : t));
    send(text, history);
  }

  async function subscribe(action: 'subscribe' | 'cancel') {
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
    setTurns((prev) => prev.map((t, i) => (i === index && t.from === 'ai-draft' ? { ...t, draft: { ...t.draft, ...patch } } : t)));
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
      setTurns((prev) => prev.map((t, i) => (i === index && t.from === 'ai-draft' ? { ...t, created: true } : t)));
      onCreated?.();
    } catch {
      setError('Could not save the task. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const lastAi = turns.length ? turns[turns.length - 1] : null;
  const canType = !busy && !(lastAi?.from === 'ai-draft' && !lastAi.created);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
          <button className="ws-icon-btn" aria-label="Close" onClick={onClose}>
            <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>
            <IonIcon icon={sparklesOutline} style={{ verticalAlign: -2, marginRight: 6 }} />
            Task assistant
          </h2>
          <span style={{ width: 44 }} />
        </div>

        {plan === null && <p className="ws-fw-empty">Loading…</p>}

        {plan === 'free' && (
          <div className="ws-glass-card ws-plus">
            <span className="ws-plus__tag">Demo · no payment is taken</span>
            <h3>WellSync Plus</h3>
            <p className="ws-plus__price">₱149<span>/month</span></p>
            <ul className="ws-info-list">
              <li>Type a few words and get a complete task.</li>
              <li>The assistant asks a quick question when it needs more.</li>
              <li>Every task comes with suggested phases to tick off.</li>
            </ul>
            <button className="ws-button-block" disabled={busy} onClick={() => subscribe('subscribe')}>
              {busy ? 'Subscribing…' : 'Subscribe (demo)'}
            </button>
            {error && <p className="ws-error">{error}</p>}
          </div>
        )}

        {plan === 'plus' && (
          <>
            <div className="ws-chat">
              {turns.length === 0 && (
                <p className="ws-fw-hint" style={{ marginTop: 16 }}>
                  Describe what you need to do, even in a few words. For example: &ldquo;math exam&rdquo; or &ldquo;group
                  presentation for marketing class&rdquo;. Suggestions are a starting point, so check them before you create the task.
                </p>
              )}
              {turns.map((t, i) => {
                if (t.from === 'user') return <div key={i} className="ws-chat__bubble ws-chat__bubble--user">{t.text}</div>;
                if (t.from === 'ai')
                  return (
                    <div key={i}>
                      <div className="ws-chat__bubble">{t.text}</div>
                      {t.options && !t.answered && i === turns.length - 1 && (
                        <div className="ws-chat__chips">
                          {t.options.map((o) => {
                            const on = picked.includes(o);
                            return (
                              <button
                                key={o}
                                type="button"
                                className={`ws-filter-chip${on ? ' is-active' : ''}`}
                                disabled={busy}
                                aria-pressed={t.multiSelect ? on : undefined}
                                onClick={() =>
                                  t.multiSelect ? setPicked(on ? picked.filter((p) => p !== o) : [...picked, o]) : answer(i, o)
                                }
                              >
                                {o}
                              </button>
                            );
                          })}
                          {t.multiSelect && (
                            <button type="button" className="ws-chat__done" disabled={busy || !picked.length} onClick={() => answer(i, picked.join(', '))}>
                              Done
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                const d = t.draft;
                return (
                  <div key={i} className="ws-glass-card ws-draft">
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
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="ws-chat__chips">
                      {PRIORITIES.map((p) => (
                        <button key={p} type="button" disabled={t.created} className={`ws-filter-chip${d.priority === p ? ' is-active' : ''}`} onClick={() => updateDraft(i, { priority: p })}>
                          {p[0].toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                      <span className="ws-fw-hint">{d.effortDays} day{d.effortDays === 1 ? '' : 's'} of work</span>
                    </div>
                    {d.projectId && <p className="ws-fw-hint">Project: {projects.find((p) => p.id === d.projectId)?.name}</p>}
                    <p className="ws-field-label" style={{ marginTop: 14 }}>Phases</p>
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
                      <p className="ws-draft__done"><IonIcon icon={checkmarkOutline} /> Task created</p>
                    ) : (
                      <button className="ws-button-block" style={{ marginTop: 14 }} disabled={busy || !d.title.trim()} onClick={() => create(i, d)}>
                        Create task
                      </button>
                    )}
                  </div>
                );
              })}
              {busy && <div className="ws-chat__bubble ws-chat__bubble--typing">Thinking…</div>}
              {error && <p className="ws-error">{error}</p>}
              <div ref={endRef} />
            </div>

            {canType && (
              <form
                className="ws-chat__input"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = input.trim();
                  if (text) send(text, turns.map((t) => (t.from === 'ai' ? { ...t, answered: true } : t)));
                }}
              >
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe a task…" aria-label="Describe a task" maxLength={500} />
                <button type="submit" className="ws-icon-btn ws-icon-btn--dark" aria-label="Send" disabled={!input.trim()}>
                  <IonIcon icon={sendOutline} style={{ fontSize: 18 }} />
                </button>
              </form>
            )}
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
