import { IonIcon } from '@ionic/react';
import { checkmarkOutline, chevronDownOutline, lockClosedOutline } from 'ionicons/icons';
import { useState } from 'react';
import { THEMES, themeMeta } from '../theme/themes';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';

/** Dropdown of every theme. Premium ones show a lock for free accounts and open the upgrade pop-up. */
export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { isPlus } = usePlan();
  const [open, setOpen] = useState(false);
  const current = themeMeta(theme);

  return (
    <div className="ws-themepicker">
      <button type="button" className="ws-glass-card ws-themepicker__current" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="ws-themepicker__swatch" style={{ background: current.swatch }} />
        <span className="ws-themepicker__label">{current.label}</span>
        <IonIcon icon={chevronDownOutline} className={`ws-themepicker__chevron${open ? ' is-open' : ''}`} />
      </button>

      {open && (
        <ul className="ws-glass-card ws-themepicker__list" role="listbox" aria-label="Theme">
          {THEMES.map((t, i) => {
            const locked = t.premium && !isPlus;
            const group = !t.premium ? 'Free' : t.mode === 'light' ? 'Plus · Light' : 'Plus · Dark';
            const prev = THEMES[i - 1];
            const prevGroup = prev ? (!prev.premium ? 'Free' : prev.mode === 'light' ? 'Plus · Light' : 'Plus · Dark') : null;
            return (
              <li key={t.id} role="option" aria-selected={theme === t.id}>
                {group !== prevGroup && <p className="ws-themepicker__group">{group}</p>}
                <button
                  type="button"
                  className={`ws-themepicker__option${theme === t.id ? ' is-selected' : ''}`}
                  onClick={() => {
                    setTheme(t.id);
                    if (!locked) setOpen(false);
                  }}
                >
                  <span className="ws-themepicker__swatch" style={{ background: t.swatch }} />
                  <span className="ws-themepicker__label">{t.label}</span>
                  {t.premium && (
                    <span className="ws-themepicker__plus">
                      {locked && <IonIcon icon={lockClosedOutline} />} Plus
                    </span>
                  )}
                  {theme === t.id && <IonIcon icon={checkmarkOutline} className="ws-themepicker__check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
