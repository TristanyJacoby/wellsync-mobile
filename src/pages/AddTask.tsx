import { IonContent, IonInput, IonTextarea, IonSelect, IonSelectOption, IonIcon } from '@ionic/react';
import { useEffect, useState } from 'react';
import { closeOutline, checkmarkOutline, addOutline, calendarOutline, timeOutline } from 'ionicons/icons';
import { addTask, updateTask, getProjects } from '../services/storage';
import { assignQuadrant } from '../utils/scheduler';
import type { Task, Priority, Category, Project } from '../types';

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
// creating a new one.
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

  const isEditing = !!editTask;

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) {
      setError('Add a title and due date first.');
      return;
    }
    setError('');
    setSaving(true);

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
      tags,
      // Firestore rejects `undefined` field values outright, so an unset
      // project has to be an absent key, not `projectId: undefined`.
      ...(projectId ? { projectId } : {}),
      createdAt: editTask?.createdAt ?? new Date().toISOString(),
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
