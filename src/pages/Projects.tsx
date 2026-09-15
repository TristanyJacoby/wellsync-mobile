import { IonContent, IonPage, IonIcon, IonInput, IonModal, useIonViewWillEnter } from '@ionic/react';
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
} from 'ionicons/icons';
import { getProjects, addProject, updateProject, deleteProject, getTasks, updateTask, deleteTask } from '../services/storage';
import { statusPillStyle } from '../utils/board';
import AddTask from './AddTask';
import type { Project, Task } from '../types';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useIonViewWillEnter(() => {
    refresh();
  });

  function refresh() {
    getProjects()
      .then(setProjects)
      .catch((err) => console.error('Failed to load projects', err));
    getTasks().then(setTasks);
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
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <h1 className="ws-headline" style={{ marginTop: 6 }}>
          Your Projects
        </h1>

        <div className="ws-glass-card" style={{ padding: 16, display: 'flex', gap: 10, marginBottom: 20 }}>
          <IonInput
            fill="outline"
            value={newName}
            placeholder="New project name"
            onIonInput={(e) => setNewName(e.detail.value ?? '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            style={{ flex: 1 }}
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

        <div className="ws-task-list">
          {projects.map((project) => {
            const projectTasks = tasksByProject.get(project.id) ?? [];
            const isExpanded = expandedId === project.id;
            const isRenaming = renamingId === project.id;

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
                    <IonInput
                      fill="outline"
                      value={renameValue}
                      autofocus
                      onIonInput={(e) => setRenameValue(e.detail.value ?? '')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(project);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      style={{ flex: 1 }}
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
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'var(--ws-glass-bg-strong)',
                            borderRadius: 'var(--ws-radius-sm)',
                            padding: '10px 12px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingTask(task)}
                            style={{
                              flex: 1,
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              textAlign: 'left',
                              font: 'inherit',
                              color: 'var(--ws-ink)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {task.title}
                          </button>
                          <span className="ws-pill" style={{ background: sPill.bg, color: sPill.text, fontSize: 11 }}>
                            {sPill.label}
                          </span>
                          <button
                            className="ws-round-btn"
                            aria-label={`Delete ${task.title}`}
                            onClick={() => removeTaskFromList(task)}
                          >
                            <IonIcon icon={trashOutline} style={{ fontSize: 13 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </IonContent>

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
