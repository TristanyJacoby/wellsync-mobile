import { IonContent, IonInput, IonTextarea, IonSelect, IonSelectOption, IonIcon, IonRange } from '@ionic/react';
import { useEffect, useState } from 'react';
import { closeOutline, checkmarkOutline, addOutline, calendarOutline, timeOutline, arrowUpOutline } from 'ionicons/icons';
import { addTask, updateTask, getProjects } from '../services/storage';
import { assignQuadrant } from '../utils/scheduler';
import type { Task, TaskPhase, Priority, Category, Project } from '../types';

const PRIORITY_OPTIONS: { id: Priority; label: string; bg: string; text: string }[] = [
  { id: 'low', label: 'Low', bg: 'var(--ws-low-bg)', text: 'var(--ws-low-text)' },
  { id: 'medium', label: 'Medium', bg: 'var(--ws-medium-bg)', text: 'var(--ws-medium-text)' },
  { id: 'high', label: 'High', bg: 'var(--ws-high-bg)', text: 'var(--ws-high-text)' },
];

// AddTask is rendered inside an IonModal, not routed inside IonTabs' router
// outlet - Ionic destroys and recreates modal content on every open (unless
// keepContentsMounted is set, which we don't use), so a plain useEffect on
// mount is correct here, unlike the tab pages which need useIonViewWillEnter.
//
// Pass `editTask` to open the form pre-filled for editing an existing task
// (saves via updateTask, preserving its id/createdAt/status) instead of
// creating a new one. Phase ticks made here save with the rest of the form.
export default function AddTask({ onClose, editTask }: { onClose: () => void; editTask?: Task }) {
  const [title, setTitle] = useState(editTask?.title ?? '');
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(editTask?.dueTime ?? '');
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? 'medium');
  const [category, setCategory] = useState<Category>(editTask?.category ?? 'Work');
  const [effortDays, setEffortDays] = useState(editTask?.effortDays ?? 1);
  const [projectId, setProjectId] = useState<string | undefined>(editTask?.projectId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<string[]>(editTask?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [phases, setPhases] = useState<TaskPhase[]>(editTask?.phases ?? []);
  const [phaseInput, setPhaseInput] = useState('');
  const [manualProgress, setManualProgress] = useState(editTask?.manualProgress ?? 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => console.error('Failed to load projects', err));
  }, []);

  const addTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagInput('');
  };

  const removeTag = (value: string) => {
    setTags(tags.filter((t) => t !== value));
  };

  const addPhase = () => {
    const value = phaseInput.trim();
    if (value) setPhases([...phases, { id: crypto.randomUUID(), title: value, done: false }]);
    setPhaseInput('');
  };

  const updatePhase = (id: string, patch: Partial<TaskPhase>) => {
    setPhases(phases.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const movePhaseUp = (index: number) => {
    if (index === 0) return;
    const next = [...phases];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setPhases(next);
  };

  const isEditing = !!editTask;

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) {
      setError('Add a title and due date first.');
      return;
    }
    setError('');
    setSaving(true);

    const cleanPhases = phases
      .map((p) => ({ ...p, title: p.title.trim() }))
      .filter((p) => p.title);

    const task: Task = {
      id: editTask?.id ?? crypto.randomUUID(),
      title: title.trim(),
      description,
      dueDate,
      dueTime,
      priority,
      category,
      effortDays,
      quadrant: assignQuadrant(priority, dueDate),
      status: editTask?.status ?? 'todo',
      // Keep a done task restorable after it's edited from the Done archive.
      ...(editTask?.completedAt ? { completedAt: editTask.completedAt } : {}),
      ...(editTask?.statusBeforeDone ? { statusBeforeDone: editTask.statusBeforeDone } : {}),
      tags,
      // Firestore rejects `undefined` field values outright, so an unset
      // project has to be an absent key, not `projectId: undefined`.
      ...(projectId ? { projectId } : {}),
      createdAt: editTask?.createdAt ?? new Date().toISOString(),
      // Phases drive progress; the slider value only applies without them.
      ...(cleanPhases.length ? { phases: cleanPhases } : { manualProgress }),
      // Focus totals are written by Pomodoro sessions, never by this form.
      ...(editTask?.focusMinutes ? { focusMinutes: editTask.focusMinutes } : {}),
      ...(editTask?.pomodoros ? { pomodoros: editTask.pomodoros } : {}),
    };

    await (isEditing ? updateTask(task) : addTask(task));
    setSaving(false);
    onClose();
  };

  return (
    <>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
          <button className="ws-icon-btn" aria-label="Close" onClick={onClose}>
            <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
          <button
            className="ws-icon-btn ws-icon-btn--dark"
            aria-label={isEditing ? 'Save changes' : 'Create task'}
            disabled={saving}
            onClick={handleCreate}
          >
            <IonIcon icon={checkmarkOutline} style={{ fontSize: 20 }} />
          </button>
        </div>

        <p className="ws-field-label" style={{ marginTop: 24 }}>
          Task Title
        </p>
        <IonInput
          fill="outline"
          value={title}
          onIonInput={(e) => setTitle(e.detail.value ?? '')}
          placeholder="Finish landing page design"
        />

        <p className="ws-field-label">Description</p>
        <IonTextarea
          fill="outline"
          value={description}
          onIonInput={(e) => setDescription(e.detail.value ?? '')}
          placeholder="What does this task involve?"
          autoGrow
        />

        <p className="ws-field-label">Due Date &amp; time</p>
        <div className="ws-datetime-row">
          <label className="ws-datetime-pill">
            <IonIcon icon={calendarOutline} />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="ws-datetime-pill">
            <IonIcon icon={timeOutline} />
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </label>
        </div>

        <p className="ws-field-label">Priority</p>
        <div className="ws-priority-row" role="radiogroup" aria-label="Priority">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={priority === p.id}
              onClick={() => setPriority(p.id)}
              className={`ws-priority-pill${priority === p.id ? ' is-selected' : ''}`}
              style={{ background: p.bg, color: p.text }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="ws-field-label">Project</p>
        <IonSelect
          fill="outline"
          value={projectId}
          placeholder={projects.length ? 'Choose a project' : 'No projects yet'}
          onIonChange={(e) => setProjectId(e.detail.value)}
        >
          {projects.map((p) => (
            <IonSelectOption key={p.id} value={p.id}>
              {p.name}
            </IonSelectOption>
          ))}
        </IonSelect>

        <p className="ws-field-label">Category</p>
        <IonSelect fill="outline" value={category} onIonChange={(e) => setCategory(e.detail.value)}>
          <IonSelectOption value="Work">Work</IonSelectOption>
          <IonSelectOption value="Personal">Personal</IonSelectOption>
        </IonSelect>

        <p className="ws-field-label">Estimated effort (days)</p>
        <IonInput
          fill="outline"
          type="number"
          min="0.5"
          step="0.5"
          value={String(effortDays)}
          onIonInput={(e) => setEffortDays(Number(e.detail.value))}
        />

        <p className="ws-field-label">Phases</p>
        <p className="ws-field-hint">
          Split the task into steps. Its progress is the share of phases you&apos;ve ticked off.
        </p>
        {phases.length > 0 && (
          <div className="ws-phase-list">
            {phases.map((phase, i) => (
              <div key={phase.id} className="ws-phase-row">
                <button
                  type="button"
                  className={`ws-checkbox-btn ws-checkbox-btn--sm${phase.done ? ' is-done' : ''}`}
                  aria-pressed={phase.done}
                  aria-label={phase.done ? `Mark ${phase.title} not done` : `Mark ${phase.title} done`}
                  onClick={() => updatePhase(phase.id, { done: !phase.done })}
                >
                  {phase.done && <IonIcon icon={checkmarkOutline} />}
                </button>
                <input
                  className="ws-plain-input ws-plain-input--sm"
                  type="text"
                  value={phase.title}
                  aria-label={`Phase ${i + 1} name`}
                  onChange={(e) => updatePhase(phase.id, { title: e.target.value })}
                />
                <button
                  type="button"
                  className="ws-round-btn"
                  aria-label={`Move ${phase.title} up`}
                  disabled={i === 0}
                  onClick={() => movePhaseUp(i)}
                >
                  <IonIcon icon={arrowUpOutline} style={{ fontSize: 13 }} />
                </button>
                <button
                  type="button"
                  className="ws-round-btn"
                  aria-label={`Remove ${phase.title}`}
                  onClick={() => setPhases(phases.filter((p) => p.id !== phase.id))}
                >
                  <IonIcon icon={closeOutline} style={{ fontSize: 14 }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="ws-phase-add">
          <input
            className="ws-plain-input ws-plain-input--sm"
            type="text"
            value={phaseInput}
            placeholder={phases.length ? 'Add another phase' : 'e.g. Research'}
            onChange={(e) => setPhaseInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPhase();
              }
            }}
          />
          <button type="button" className="ws-tag-add" onClick={addPhase} disabled={!phaseInput.trim()}>
            <IonIcon icon={addOutline} style={{ fontSize: 14 }} />
            Add
          </button>
        </div>

        {phases.length === 0 && (
          <>
            <p className="ws-field-label">Progress · {manualProgress}%</p>
            <IonRange
              min={0}
              max={100}
              step={5}
              value={manualProgress}
              aria-label="Progress"
              onIonInput={(e) => setManualProgress(e.detail.value as number)}
            />
          </>
        )}

        <p className="ws-field-label">Tags</p>
        <div className="ws-tag-row">
          {tags.map((tag) => (
            <span key={tag} className="ws-tag-chip">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                <IonIcon icon={closeOutline} style={{ fontSize: 13 }} />
              </button>
            </span>
          ))}
          <button type="button" className="ws-tag-add" onClick={addTag} disabled={!tagInput.trim()}>
            <IonIcon icon={addOutline} style={{ fontSize: 14 }} />
            Add
          </button>
        </div>
        <div className="ws-tag-input-row">
          <IonInput
            fill="outline"
            value={tagInput}
            placeholder="Type a tag, then Add"
            onIonInput={(e) => setTagInput(e.detail.value ?? '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--ws-high-text)', marginTop: 14, fontSize: 13, fontWeight: 600 }}>
            {error}
          </p>
        )}

        <button className="ws-button-block" style={{ marginTop: 26 }} disabled={saving} onClick={handleCreate}>
          {isEditing ? 'Save Changes' : 'Create Task'}
        </button>
      </IonContent>
    </>
  );
}
