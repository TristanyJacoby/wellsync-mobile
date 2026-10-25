import { IonIcon } from '@ionic/react';
import { closeOutline, reorderThreeOutline } from 'ionicons/icons';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskPhase } from '../types';

function PhaseRow({
  phase,
  index,
  onRename,
  onRemove,
}: {
  phase: TaskPhase;
  index: number;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
  return (
    <div
      ref={setNodeRef}
      className={`ws-phase-row${isDragging ? ' is-dragging' : ''}`}
      // Vertical movement only; the row follows the pointer and the rest shift around it.
      style={{ transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="ws-phase-grip"
        aria-label={`Drag to reorder phase ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <IonIcon icon={reorderThreeOutline} />
      </button>
      <span className="ws-phase-num">Phase {index + 1}</span>
      <input
        className="ws-plain-input ws-plain-input--sm"
        type="text"
        value={phase.title}
        aria-label={`Phase ${index + 1} name`}
        onChange={(e) => onRename(e.target.value)}
      />
      <button type="button" className="ws-round-btn" aria-label={`Remove phase ${index + 1}`} onClick={onRemove}>
        <IonIcon icon={closeOutline} style={{ fontSize: 14 }} />
      </button>
    </div>
  );
}

/** Numbered phases the user can reorder by dragging the handle. */
export default function PhaseList({ phases, onChange }: { phases: TaskPhase[]; onChange: (phases: TaskPhase[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = phases.findIndex((p) => p.id === active.id);
    const to = phases.findIndex((p) => p.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(phases, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={phases.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="ws-phase-list">
          {phases.map((phase, i) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              index={i}
              onRename={(title) => onChange(phases.map((p) => (p.id === phase.id ? { ...p, title } : p)))}
              onRemove={() => onChange(phases.filter((p) => p.id !== phase.id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
