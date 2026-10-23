import { IonContent, IonIcon, useIonAlert } from '@ionic/react';
import { useState } from 'react';
import { closeOutline, addOutline, trashOutline, checkmarkOutline } from 'ionicons/icons';
import { saveCategories, reassignCategory } from '../services/storage';
import { CATEGORY_COLORS } from '../utils/categories';
import type { CategoryDef } from '../types';

/**
 * Add, rename, recolor and delete calendar categories. Every change saves
 * immediately; deleting a category that still has tasks first asks where to
 * move them, and the last category can't be deleted.
 */
export default function ManageCategories({
  categories,
  taskCounts,
  onChange,
  onClose,
}: {
  categories: CategoryDef[];
  taskCounts: Record<string, number>;
  onChange: (categories: CategoryDef[]) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();

  async function commit(next: CategoryDef[]) {
    onChange(next);
    await saveCategories(next);
  }

  function add() {
    const name = newName.trim();
    if (!name) return;
    const used = new Set(categories.map((c) => c.color));
    const color = CATEGORY_COLORS.find((c) => !used.has(c)) ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
    commit([...categories, { id: crypto.randomUUID(), name, color }]);
    setNewName('');
  }

  function rename(id: string, name: string) {
    const trimmed = name.trim();
    const current = categories.find((c) => c.id === id);
    if (!trimmed || trimmed === current?.name) return;
    commit(categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
  }

  function remove(category: CategoryDef) {
    const others = categories.filter((c) => c.id !== category.id);
    const count = taskCounts[category.id] ?? 0;
    if (count === 0) {
      commit(others);
      return;
    }
    presentAlert({
      header: `Delete "${category.name}"?`,
      message: `It has ${count} task${count === 1 ? '' : 's'}. Move ${count === 1 ? 'it' : 'them'} to:`,
      inputs: others.map((c, i) => ({ type: 'radio' as const, label: c.name, value: c.id, checked: i === 0 })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Move & delete',
          role: 'destructive',
          handler: async (toId: string) => {
            await reassignCategory(category.id, toId);
            await commit(others);
          },
        },
      ],
    });
  }

  return (
    <IonContent className="ion-padding">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
        <button className="ws-icon-btn" aria-label="Close" onClick={onClose}>
          <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>Categories</h2>
        <span style={{ width: 44 }} />
      </div>
      <p className="ws-field-hint" style={{ marginTop: 16 }}>
        Group tasks your way, like School, Org, Health or Part-time job. Tap a color dot to change it.
      </p>

      <div className="ws-category-list">
        {categories.map((category) => (
          <div key={category.id} className="ws-glass-card ws-category-row">
            <div className="ws-category-row__main">
              <button
                type="button"
                className="ws-category-swatch"
                style={{ background: category.color }}
                aria-label={`Change color of ${category.name}`}
                aria-expanded={colorPickerFor === category.id}
                onClick={() => setColorPickerFor(colorPickerFor === category.id ? null : category.id)}
              />
              <input
                className="ws-plain-input ws-plain-input--sm"
                type="text"
                defaultValue={category.name}
                aria-label={`Rename ${category.name}`}
                onBlur={(e) => rename(category.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
              <span className="ws-category-row__count ws-num">{taskCounts[category.id] ?? 0}</span>
              <button
                type="button"
                className="ws-round-btn"
                aria-label={`Delete ${category.name}`}
                disabled={categories.length === 1}
                onClick={() => remove(category)}
              >
                <IonIcon icon={trashOutline} style={{ fontSize: 14 }} />
              </button>
            </div>
            {colorPickerFor === category.id && (
              <div className="ws-color-row" role="radiogroup" aria-label={`Color for ${category.name}`}>
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={category.color === color}
                    aria-label={color}
                    className="ws-category-swatch"
                    style={{ background: color }}
                    onClick={() => {
                      commit(categories.map((c) => (c.id === category.id ? { ...c, color } : c)));
                      setColorPickerFor(null);
                    }}
                  >
                    {category.color === color && <IonIcon icon={checkmarkOutline} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="ws-phase-add" style={{ marginTop: 12 }}>
        <input
          className="ws-plain-input ws-plain-input--sm"
          type="text"
          value={newName}
          placeholder="New category name"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
        />
        <button type="button" className="ws-tag-add" onClick={add} disabled={!newName.trim()}>
          <IonIcon icon={addOutline} style={{ fontSize: 14 }} />
          Add
        </button>
      </div>
    </IonContent>
  );
}
