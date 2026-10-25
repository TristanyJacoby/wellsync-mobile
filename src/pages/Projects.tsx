import { IonContent, IonPage, IonIcon, IonModal, useIonViewWillEnter } from '@ionic/react';
import { useMemo, useState } from 'react';
import {
  folderOutline,
  addOutline,
  trashOutline,
  chevronDownOutline,
  chevronForwardOutline,
  pencilOutline,
  checkmarkOutline,
  closeOutline,
  gridOutline,
  listOutline,
  removeCircleOutline,
} from 'ionicons/icons';
import {
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  getProjectsLayout,
  saveProjectsLayout,
  type ProjectsLayout,
} from '../services/storage';
import { useTasksChanged } from '../contexts/TaskChangeContext';
import { statusPillStyle, stopping } from '../utils/board';
import { useUndoToast } from '../hooks/useUndoToast';
import AddTask from './AddTask';
import { projectProgress, taskProgress } from '../utils/progress';
import type { Project, Task } from '../types';

/** Moves tasks into a project (or out of one when projectId is undefined), keeping Firestore free of undefined fields. */
function withProject(task: Task, projectId?: string): Task {
  const { projectId: _old, ...rest } = task;
  return projectId ? { ...rest, projectId } : rest;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [layout, setLayout] = useState<ProjectsLayout>('list');
  const [openProjectId, setOpenProjectId] = useState<string | null>(null); // grid layout: project shown in a sheet
  const [pickingFor, setPickingFor] = useState<Project | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const showUndo = useUndoToast();

  useIonViewWillEnter(() => {
    refresh();
  });

  // The global create button can add a task while this tab is showing.
  useTasksChanged(refresh);

  function refresh() {
    getProjects()
      .then(setProjects)
      .catch((err) => console.error('Failed to load projects', err));
    getTasks().then(setTasks);
    getProjectsLayout().then(setLayout).catch(() => undefined);
  }

  function changeLayout(next: ProjectsLayout) {
    setLayout(next);
    saveProjectsLayout(next).catch((err) => console.error('Failed to save layout', err));
  }

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.projectId) continue;
      if (!map.has(task.projectId)) map.set(task.projectId, []);
      map.get(task.projectId)!.push(task);
    }
    return map;
  }, [tasks]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const project: Project = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
    await addProject(project);
    setProjects((prev) => [...prev, project]);
    setNewName('');
    setCreating(false);
  }

  async function handleDelete(project: Project) {
    // Deleting a project must not leave tasks pointing at a project that no
    // longer exists - unassign them (not delete them) first.
    const affected = tasksByProject.get(project.id) ?? [];
    for (const task of affected) {
      const { projectId: _drop, ...rest } = task;
      await updateTask(rest as Task);
    }
    await deleteProject(project.id);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setTasks((prev) => prev.map((t) => (t.projectId === project.id ? { ...t, projectId: undefined } : t)));
    if (expandedId === project.id) setExpandedId(null);
  }

  function startRename(project: Project) {
    setRenamingId(project.id);
    setRenameValue(project.name);
  }

  async function saveRename(project: Project) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === project.name) return;
    const updated = { ...project, name };
    await updateProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)));
  }

  async function removeTaskFromList(task: Task) {
    await deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    showUndo('Task deleted', async () => {
      await addTask(task);
      setTasks((prev) => [...prev, task]);
    });
  }

  async function addPickedTasks() {
    if (!pickingFor) return;
    const chosen = tasks.filter((t) => picked.has(t.id));
    await Promise.all(chosen.map((t) => updateTask(withProject(t, pickingFor.id))));
    setTasks((prev) => prev.map((t) => (picked.has(t.id) ? withProject(t, pickingFor.id) : t)));
    setExpandedId(pickingFor.id);
    setPickingFor(null);
    setPicked(new Set());
  }

  async function removeFromProject(task: Task) {
    await updateTask(withProject(task));
    setTasks((prev) => prev.map((t) => (t.id === task.id ? withProject(t) : t)));
  }

  function openPicker(project: Project) {
    setPicked(new Set());
    setPickingFor(project);
  }

  // Tasks that could join the picking project: open tasks not already in it.
  const pickable = pickingFor
    ? tasks
        .filter((t) => t.projectId !== pickingFor.id && t.status !== 'done')
        .sort((a, b) => Number(!!a.projectId) - Number(!!b.projectId) || a.dueDate.localeCompare(b.dueDate))
    : [];

  function renderCard(project: Project, forceExpanded = false) {
    const projectTasks = tasksByProject.get(project.id) ?? [];
    const isExpanded = forceExpanded || expandedId === project.id;
    const isRenaming = renamingId === project.id;
    const percent = projectProgress(projectTasks);

    return (
      <div key={project.id} className="ws-glass-card ws-task-card">
        <div className="ws-task-card__top">
          <span className="ws-pill" style={{ background: 'var(--ws-inprogress-bg)', color: 'var(--ws-inprogress-text)' }}>
            <IonIcon icon={folderOutline} style={{ fontSize: 13 }} />
            {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isRenaming && (
              <button className="ws-round-btn" aria-label={`Rename ${project.name}`} onClick={() => startRename(project)}>
                <IonIcon icon={pencilOutline} style={{ fontSize: 14 }} />
              </button>
            )}
            <button className="ws-round-btn" aria-label={`Delete ${project.name}`} onClick={() => handleDelete(project)}>
              <IonIcon icon={trashOutline} style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        {isRenaming ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input
              className="ws-plain-input ws-plain-input--sm"
              type="text"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename(project);
                if (e.key === 'Escape') setRenamingId(null);
              }}
            />
            <button className="ws-round-btn" aria-label="Save name" onClick={() => saveRename(project)}>
              <IonIcon icon={checkmarkOutline} style={{ fontSize: 15 }} />
            </button>
            <button className="ws-round-btn" aria-label="Cancel rename" onClick={() => setRenamingId(null)}>
              <IonIcon icon={closeOutline} style={{ fontSize: 15 }} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpandedId(isExpanded ? null : project.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'none',
              border: 'none',
              padding: 0,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${project.name}`}
          >
            <p className="ws-task-card__title" style={{ margin: 0, flex: 1 }}>
              {project.name}
            </p>
            <IonIcon icon={isExpanded ? chevronDownOutline : chevronForwardOutline} style={{ fontSize: 16, color: 'var(--ws-ink-muted)' }} />
          </button>
        )}

        {projectTasks.length > 0 && (
          <div className="ws-progress">
            <div
              className="ws-progress__track"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${project.name} progress`}
            >
              <div className="ws-progress__fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="ws-progress__label">{percent}% complete</span>
          </div>
        )}

        {isExpanded && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projectTasks.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ws-ink-muted)', margin: 0 }}>
                No tasks assigned to this project yet.
              </p>
            )}
            {projectTasks.map((task) => {
              const sPill = statusPillStyle(task.status);
              return (
                <div key={task.id} className="ws-project-task ws-task-card--tappable" onClick={() => setEditingTask(task)}>
                  <span className="ws-project-task__title">{task.title}</span>
                  {!!task.phases?.length && <span className="ws-project-task__percent ws-num">{taskProgress(task)}%</span>}
                  <span className="ws-pill" style={{ background: sPill.bg, color: sPill.text, fontSize: 11 }}>
                    {sPill.label}
                  </span>
                  <button
                    className="ws-round-btn"
                    aria-label={`Edit ${task.title}`}
                    onClick={stopping(() => setEditingTask(task))}
                  >
                    <IonIcon icon={pencilOutline} style={{ fontSize: 13 }} />
                  </button>
                  <button
                    className="ws-round-btn"
                    aria-label={`Remove ${task.title} from ${project.name}`}
                    onClick={stopping(() => removeFromProject(task))}
                  >
                    <IonIcon icon={removeCircleOutline} style={{ fontSize: 14 }} />
                  </button>
                  <button
                    className="ws-round-btn"
                    aria-label={`Delete ${task.title}`}
                    onClick={stopping(() => removeTaskFromList(task))}
                  >
                    <IonIcon icon={trashOutline} style={{ fontSize: 13 }} />
                  </button>
                </div>
              );
            })}
            <button type="button" className="ws-draft__add" onClick={() => openPicker(project)}>
              <IonIcon icon={addOutline} /> Add existing tasks
            </button>
          </div>
        )}

      </div>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding ws-has-fab">
        <h1 className="ws-headline" style={{ marginTop: 6 }}>
          Your Projects
        </h1>
        <p className="ws-page-description">Group related tasks together so you can track and manage them as one unit.</p>

        <div className="ws-glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <input
            className="ws-plain-input"
            type="text"
            value={newName}
            placeholder="New project name"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <button
            className="ws-icon-btn ws-icon-btn--dark"
            aria-label="Create project"
            disabled={creating || !newName.trim()}
            onClick={handleCreate}
          >
            <IonIcon icon={addOutline} style={{ fontSize: 20 }} />
          </button>
        </div>

        {projects.length === 0 && (
          <div className="ws-glass-card ws-empty">
            <IonIcon icon={folderOutline} className="ws-empty__icon" />
            <p>No projects yet — create one above to group your tasks.</p>
          </div>
        )}

        <div className="ws-projects-toolbar">
          <p className="ws-field-label" style={{ margin: 0 }}>
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </p>
          <div className="ws-layout-toggle" role="group" aria-label="Layout">
            <button type="button" aria-pressed={layout === 'list'} aria-label="List layout" className={layout === 'list' ? 'is-active' : ''} onClick={() => changeLayout('list')}>
              <IonIcon icon={listOutline} />
            </button>
            <button type="button" aria-pressed={layout === 'grid'} aria-label="Grid layout" className={layout === 'grid' ? 'is-active' : ''} onClick={() => changeLayout('grid')}>
              <IonIcon icon={gridOutline} />
            </button>
          </div>
        </div>

        {layout === 'list' ? (
          <div className="ws-task-list">{projects.map((project) => renderCard(project))}</div>
        ) : (
          <div className="ws-project-grid">
            {projects.map((project) => {
              const projectTasks = tasksByProject.get(project.id) ?? [];
              const percent = projectProgress(projectTasks);
              return (
                <button key={project.id} type="button" className="ws-glass-card ws-project-tile" onClick={() => setOpenProjectId(project.id)}>
                  <span className="ws-project-tile__icon">
                    <IonIcon icon={folderOutline} />
                  </span>
                  <strong>{project.name}</strong>
                  <span className="ws-project-tile__meta">
                    {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}
                  </span>
                  <span className="ws-progress__track" aria-hidden="true">
                    <span className="ws-progress__fill" style={{ width: `${percent}%`, display: 'block' }} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </IonContent>

      <IonModal isOpen={layout === 'grid' && !!openProjectId} onDidDismiss={() => setOpenProjectId(null)}>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, marginBottom: 12 }}>
            <button className="ws-icon-btn" aria-label="Close" onClick={() => setOpenProjectId(null)}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>
          {projects.filter((p) => p.id === openProjectId).map((p) => renderCard(p, true))}
        </IonContent>
      </IonModal>

      <IonModal isOpen={!!pickingFor} onDidDismiss={() => setPickingFor(null)}>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <button className="ws-icon-btn" aria-label="Close" onClick={() => setPickingFor(null)}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>Add to {pickingFor?.name}</h2>
            <span style={{ width: 44 }} />
          </div>
          <p className="ws-field-hint" style={{ marginTop: 14 }}>
            Pick the tasks to move into this project. A task can only belong to one project.
          </p>
          {pickable.length === 0 ? (
            <p className="ws-fw-empty">No open tasks to add.</p>
          ) : (
            <div className="ws-fw-list" style={{ marginTop: 14, paddingBottom: 90 }}>
              {pickable.map((t) => {
                const on = picked.has(t.id);
                const other = projects.find((p) => p.id === t.projectId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`ws-glass-card ws-fw-row ws-pick-row${on ? ' is-picked' : ''}`}
                    aria-pressed={on}
                    onClick={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      })
                    }
                  >
                    <span className={`ws-checkbox-btn${on ? ' is-done' : ''}`} aria-hidden="true">
                      {on && <IonIcon icon={checkmarkOutline} />}
                    </span>
                    <span className="ws-fw-row__text">
                      <strong>{t.title}</strong>
                      <span>{other ? `Currently in ${other.name}` : 'No project'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </IonContent>
        {picked.size > 0 && (
          <div className="ws-pick-bar">
            <button type="button" className="ws-button-block" onClick={addPickedTasks}>
              Add {picked.size} task{picked.size === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </IonModal>

      <IonModal isOpen={!!editingTask} onDidDismiss={() => setEditingTask(null)}>
        {editingTask && (
          <AddTask
            editTask={editingTask}
            onClose={() => {
              setEditingTask(null);
              refresh();
            }}
          />
        )}
      </IonModal>
    </IonPage>
  );
}
