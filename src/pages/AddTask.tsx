import { IonContent, IonInput, IonTextarea, IonIcon } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import {
  closeOutline,
  checkmarkOutline,
  addOutline,
  removeOutline,
  calendarOutline,
  timeOutline,
  chevronDownOutline,
  chevronUpOutline,
} from 'ionicons/icons';
import { addTask, updateTask, getProjects, getCategories, saveCategories, addProject, getSavedTags, saveSavedTags } from '../services/storage';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS } from '../utils/categories';
import PhaseList from '../components/PhaseList';
import PopupCard from '../components/PopupCard';
import { assignQuadrant } from '../utils/scheduler';
import AssistantSheet from '../components/AssistantSheet';
import WellBotIcon from '../components/WellBotIcon';
import type { Task, TaskPhase, Priority, Category, CategoryDef, Project } from '../types';

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
  const [showAssistant, setShowAssistant] = useState(false);
  const [aiCreated, setAiCreated] = useState(false);
  const [title, setTitle] = useState(editTask?.title ?? '');
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(editTask?.dueTime ?? '');
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? 'medium');
  const [category, setCategory] = useState<Category>(editTask?.category ?? 'Work');
  const [effortDays, setEffortDays] = useState(editTask?.effortDays ?? 1);
  const [projectId, setProjectId] = useState<string | undefined>(editTask?.projectId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState<string[]>(editTask?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [phases, setPhases] = useState<TaskPhase[]>(editTask?.phases ?? []);
  const [phaseInput, setPhaseInput] = useState('');
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string | null>(null); // null = closed
  const [newProject, setNewProject] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const phaseInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => console.error('Failed to load projects', err));
    getCategories()
      .then((list) => {
        setCategories(list);
        // New tasks default to the first category if "Work" was deleted.
        if (!editTask) setCategory((c) => (list.some((x) => x.id === c) ? c : list[0].id));
      })
      .catch((err) => console.error('Failed to load categories', err));
    getSavedTags()
      .then(setSavedTags)
      .catch((err) => console.error('Failed to load saved tags', err));
  }, []);

  // An empty "+ Add" still responds: it puts the cursor in the field.
  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return tagInputRef.current?.focus();
    if (!tags.includes(value)) setTags([...tags, value]);
    if (!savedTags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      const next = [...savedTags, value];
      setSavedTags(next);
      saveSavedTags(next).catch((err) => console.error('Failed to save tag', err));
    }
    setTagInput('');
  };

  const toggleTag = (value: string) => setTags(tags.includes(value) ? tags.filter((t) => t !== value) : [...tags, value]);

  const addPhase = () => {
    const value = phaseInput.trim();
    if (!value) return phaseInputRef.current?.focus();
    setPhases([...phases, { id: crypto.randomUUID(), title: value, done: false }]);
    setPhaseInput('');
  };

  const createCategory = async () => {
    const name = (newCategory ?? '').trim();
    if (!name) return;
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setCategory(existing.id);
    } else {
      const used = new Set(categories.map((c) => c.color));
      const color = CATEGORY_COLORS.find((c) => !used.has(c)) ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
      const created = { id: crypto.randomUUID(), name, color };
      const next = [...categories, created];
      setCategories(next);
      setCategory(created.id);
      saveCategories(next).catch((err) => console.error('Failed to save category', err));
    }
    setNewCategory(null);
  };

  const createProject = async () => {
    const name = newProject.trim();
    if (!name) return;
    const existing = projects.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setProjectId(existing.id);
    } else {
      const created: Project = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
      setProjects([...projects, created]);
      setProjectId(created.id);
      addProject(created).catch((err) => console.error('Failed to save project', err));
    }
    setNewProject('');
    setShowProjectPicker(false);
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
      // Phases are what progress is measured by; a task without them is just To Do / In Progress / Done.
      ...(cleanPhases.length ? { phases: cleanPhases } : {}),
      // Focus totals are written by Pomodoro sessions, never by this form.
      ...(editTask?.focusMinutes ? { focusMinutes: editTask.focusMinutes } : {}),
      ...(editTask?.pomodoros ? { pomodoros: editTask.pomodoros } : {}),
    };

    await (isEditing ? updateTask(task) : addTask(task));
    setSaving(false);
    onClose();
  };

  const selectedCategory = categories.find((c) => c.id === category);
  const selectedProject = projects.find((p) => p.id === projectId);
  const moreSummary = [
    selectedCategory?.name ?? category,
    `${effortDays} day${effortDays === 1 ? '' : 's'} of work`,
    selectedProject?.name ?? 'No project',
    ...(tags.length ? [`${tags.length} tag${tags.length === 1 ? '' : 's'}`] : []),
  ].join(' · ');

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

        {!isEditing && (
          <button type="button" className="ws-assistant-link" onClick={() => setShowAssistant(true)}>
            <WellBotIcon size={16} /> Draft with WellBot
          </button>
        )}

        {/* 1. What - the only part every task needs. */}
        <section className="ws-glass-card ws-form-card" style={{ marginTop: 20 }}>
          <p className="ws-field-label">Task Title</p>
          <IonInput
            fill="outline"
            value={title}
            onIonInput={(e) => setTitle(e.detail.value ?? '')}
          />

          <p className="ws-field-label">
            Description <span className="ws-field-optional">optional</span>
          </p>
          <IonTextarea
            fill="outline"
            value={description}
            onIonInput={(e) => setDescription(e.detail.value ?? '')}
            autoGrow
          />

          <p className="ws-field-label">
            Phases <span className="ws-field-optional">optional</span>
          </p>
          <p className="ws-field-hint">Big task? Split it into steps and drag the handle to reorder them. Progress is the share you tick off.</p>
          {phases.length > 0 && <PhaseList phases={phases} onChange={setPhases} />}
          <div className="ws-phase-add">
            <input
              ref={phaseInputRef}
              className="ws-plain-input ws-plain-input--sm"
              type="text"
              value={phaseInput}
              placeholder={`Phase ${phases.length + 1}`}
              aria-label="New phase"
              onChange={(e) => setPhaseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPhase();
                }
              }}
            />
            <button type="button" className="ws-tag-add" onClick={addPhase}>
              <IonIcon icon={addOutline} style={{ fontSize: 14 }} />
              Add
            </button>
          </div>
        </section>

        {/* 2. When & how urgent - what the scheduler ranks on. */}
        <section className="ws-glass-card ws-form-card">
          <p className="ws-field-label">Due date &amp; time</p>
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
        </section>

        {/* 3. Everything else, folded away with a summary of what's set. */}
        <section className="ws-glass-card ws-form-card">
          <button
            type="button"
            className="ws-more-toggle"
            aria-expanded={showMore}
            onClick={() => setShowMore((v) => !v)}
          >
            <span className="ws-more-toggle__text">
              <span className="ws-more-toggle__title">More options</span>
              <span className="ws-more-toggle__summary">{moreSummary}</span>
            </span>
            <IonIcon icon={showMore ? chevronUpOutline : chevronDownOutline} />
          </button>

          {showMore && (
            <>
              <p className="ws-field-label">Category</p>
              <div className="ws-choice-row" role="radiogroup" aria-label="Category">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={category === c.id}
                    className={`ws-filter-chip${category === c.id ? ' is-active' : ''}`}
                    onClick={() => setCategory(c.id)}
                  >
                    <span className="ws-category-dot" style={{ background: c.color }} aria-hidden="true" />
                    {c.name}
                  </button>
                ))}
                {newCategory === null && (
                  <button type="button" className="ws-filter-chip ws-filter-chip--add" onClick={() => setNewCategory('')}>
                    <IonIcon icon={addOutline} /> New category
                  </button>
                )}
              </div>
              {newCategory !== null && (
                <div className="ws-phase-add">
                  <input
                    className="ws-plain-input ws-plain-input--sm"
                    type="text"
                    autoFocus
                    value={newCategory}
                    maxLength={24}
                    placeholder="Category name"
                    aria-label="New category name"
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        createCategory();
                      }
                      if (e.key === 'Escape') setNewCategory(null);
                    }}
                  />
                  <button type="button" className="ws-tag-add" onClick={createCategory} disabled={!newCategory.trim()}>
                    <IonIcon icon={addOutline} style={{ fontSize: 14 }} />
                    Create
                  </button>
                </div>
              )}

              <p className="ws-field-label">Project</p>
              <button type="button" className="ws-select-trigger" onClick={() => setShowProjectPicker(true)} aria-haspopup="dialog">
                <span className={selectedProject ? '' : 'is-placeholder'}>{selectedProject?.name ?? (projects.length ? 'Choose a project' : 'No project')}</span>
                <IonIcon icon={chevronDownOutline} />
              </button>

              <p className="ws-field-label">Effort</p>
              <div className="ws-stepper" role="group" aria-label="Estimated effort in days">
                <button
                  type="button"
                  className="ws-round-btn"
                  aria-label="Less effort"
                  disabled={effortDays <= 0.5}
                  onClick={() => setEffortDays((d) => Math.max(0.5, d - 0.5))}
                >
                  <IonIcon icon={removeOutline} />
                </button>
                <span className="ws-stepper__value ws-num">
                  {effortDays} day{effortDays === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="ws-round-btn"
                  aria-label="More effort"
                  onClick={() => setEffortDays((d) => d + 0.5)}
                >
                  <IonIcon icon={addOutline} />
                </button>
              </div>

              <p className="ws-field-label">Tags</p>
              {(() => {
                // Every tag you've used before, plus any picked on this task: tap to toggle.
                const all = [...savedTags, ...tags.filter((t) => !savedTags.includes(t))];
                return all.length > 0 ? (
                  <div className="ws-tag-row" role="group" aria-label="Your tags">
                    {all.map((tag) => {
                      const on = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={on}
                          className={`ws-filter-chip ws-filter-chip--tag${on ? ' is-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                ) : null;
              })()}
              <div className="ws-phase-add">
                <input
                  ref={tagInputRef}
                  className="ws-plain-input ws-plain-input--sm"
                  type="text"
                  value={tagInput}
                  placeholder="New tag"
                  aria-label="New tag"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button type="button" className="ws-tag-add" onClick={addTag}>
                  <IonIcon icon={addOutline} style={{ fontSize: 14 }} />
                  Add
                </button>
              </div>
            </>
          )}
        </section>

        {error && (
          <p role="alert" style={{ color: 'var(--ws-high-text)', marginTop: 14, fontSize: 13, fontWeight: 600 }}>
            {error}
          </p>
        )}

        <button className="ws-button-block" style={{ marginTop: 20 }} disabled={saving} onClick={handleCreate}>
          {isEditing ? 'Save Changes' : 'Create Task'}
        </button>
      </IonContent>

      <PopupCard open={showProjectPicker} onClose={() => setShowProjectPicker(false)} label="Project">
        <div className="ws-tasklist__head">
          <h3>Project</h3>
          <button type="button" className="ws-round-btn" aria-label="Close" onClick={() => setShowProjectPicker(false)}>
            <IonIcon icon={closeOutline} style={{ fontSize: 18 }} />
          </button>
        </div>
        <div className="ws-tasklist" role="radiogroup" aria-label="Project">
          {[{ id: undefined as string | undefined, name: 'No project' }, ...projects].map((p) => {
            const on = projectId === p.id;
            return (
              <button
                key={p.id ?? 'none'}
                type="button"
                role="radio"
                aria-checked={on}
                className={`ws-tasklist__row ws-radio-row${on ? ' is-on' : ''}`}
                onClick={() => {
                  setProjectId(p.id);
                  setShowProjectPicker(false);
                }}
              >
                <span className={`ws-radio-dot${on ? ' is-on' : ''}`} aria-hidden="true" />
                <span className="ws-tasklist__text">
                  <strong>{p.name}</strong>
                </span>
              </button>
            );
          })}
        </div>
        <p className="ws-field-label" style={{ marginTop: 14 }}>
          New project
        </p>
        <div className="ws-phase-add" style={{ width: '100%' }}>
          <input
            className="ws-plain-input ws-plain-input--sm"
            type="text"
            value={newProject}
            maxLength={40}
            placeholder="Project name"
            aria-label="New project name"
            onChange={(e) => setNewProject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createProject();
              }
            }}
          />
          <button type="button" className="ws-tag-add" onClick={createProject} disabled={!newProject.trim()}>
            <IonIcon icon={addOutline} style={{ fontSize: 14 }} />
            Create
          </button>
        </div>
      </PopupCard>

      <AssistantSheet
        isOpen={showAssistant}
        onCreated={() => setAiCreated(true)}
        onClose={() => {
          setShowAssistant(false);
          // The assistant already saved a task, so this blank form is done.
          if (aiCreated) onClose();
        }}
      />
    </>
  );
}
