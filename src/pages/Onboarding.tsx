import { IonContent, IonPage, IonInput, IonIcon } from '@ionic/react';
import { useState } from 'react';
import { closeOutline } from 'ionicons/icons';
import { saveProfile } from '../services/storage';
import type { OnboardingProfile, WorkStyle, PriorityLens, ReminderStyle } from '../types';

const WORK_STYLE_OPTIONS: { id: WorkStyle; label: string }[] = [
  { id: 'planner', label: 'I plan everything ahead of time' },
  { id: 'deadline-driven', label: 'I work best close to deadlines' },
  { id: 'spontaneous', label: 'I go with whatever feels most urgent' },
];

const PRIORITY_LENS_OPTIONS: { id: PriorityLens; label: string }[] = [
  { id: 'urgency', label: "Whatever's due soonest" },
  { id: 'importance', label: 'Whatever matters most' },
  { id: 'effort', label: "Whatever's quickest to finish" },
];

const REMINDER_OPTIONS: { id: ReminderStyle; label: string }[] = [
  { id: 'early', label: 'Remind me well in advance' },
  { id: 'last-minute', label: "Remind me right before it's due" },
  { id: 'self-check', label: "I'll check the app myself" },
];

type Step = 'name' | 'workStyle' | 'priorityLens' | 'reminderStyle';
const STEPS: Step[] = ['name', 'workStyle', 'priorityLens', 'reminderStyle'];

function OptionRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`ws-option${selected ? ' is-selected' : ''}`}
    >
      <span className="ws-option__lamp" aria-hidden="true" />
      {label}
    </div>
  );
}

// Pass `initialProfile` + `onCancel` to reuse this flow as an "edit
// preferences" form (from Profile) instead of first-time onboarding -
// pre-fills every step and adds a close button that discards changes.
export default function Onboarding({
  onComplete,
  initialProfile,
  onCancel,
}: {
  onComplete: () => void;
  initialProfile?: OnboardingProfile;
  onCancel?: () => void;
}) {
  const isEditing = !!initialProfile;
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [workStyle, setWorkStyle] = useState<WorkStyle | null>(initialProfile?.workStyle ?? null);
  const [priorityLens, setPriorityLens] = useState<PriorityLens | null>(initialProfile?.priorityLens ?? null);
  const [reminderStyle, setReminderStyle] = useState<ReminderStyle | null>(initialProfile?.reminderStyle ?? null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];

  const canAdvance =
    (step === 'name' && name.trim().length > 0) ||
    (step === 'workStyle' && !!workStyle) ||
    (step === 'priorityLens' && !!priorityLens) ||
    (step === 'reminderStyle' && !!reminderStyle);

  const handleNext = async () => {
    if (!canAdvance) {
      setError(step === 'name' ? 'Enter your name to continue.' : 'Pick an option to continue.');
      return;
    }
    setError('');

    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    setSaving(true);
    await saveProfile({
      name: name.trim(),
      workStyle: workStyle!,
      priorityLens: priorityLens!,
      reminderStyle: reminderStyle!,
      completedOnboarding: true,
    });
    onComplete();
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div style={{ paddingTop: isEditing ? '2vh' : '8vh' }}>
          {isEditing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="ws-icon-btn" aria-label="Cancel" onClick={onCancel}>
                <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 30 }} aria-hidden="true">
            {STEPS.map((_, i) => (
              <div key={i} className={`ws-progress-track${i <= stepIndex ? ' is-filled' : ''}`} />
            ))}
          </div>

          {step === 'name' && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: 'var(--ws-ink)' }}>
                What should we call you?
              </h1>
              <p style={{ color: 'var(--ws-ink-muted)', marginBottom: 22, fontSize: 14 }}>
                We&apos;ll use this to greet you around the app.
              </p>
              <IonInput
                fill="outline"
                placeholder="Your name"
                value={name}
                onIonInput={(e) => setName(e.detail.value ?? '')}
              />
            </>
          )}

          {step === 'workStyle' && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: 'var(--ws-ink)' }}>
                Hi {name || 'there'}, how do you work?
              </h1>
              <p style={{ color: 'var(--ws-ink-muted)', marginBottom: 22, fontSize: 14 }}>Which sounds most like you?</p>
              <div role="radiogroup" aria-label="Work style">
                {WORK_STYLE_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.id}
                    label={opt.label}
                    selected={workStyle === opt.id}
                    onClick={() => setWorkStyle(opt.id)}
                  />
                ))}
              </div>
            </>
          )}

          {step === 'priorityLens' && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: 'var(--ws-ink)' }}>
                When things pile up...
              </h1>
              <p style={{ color: 'var(--ws-ink-muted)', marginBottom: 22, fontSize: 14 }}>
                What usually decides what you tackle first?
              </p>
              <div role="radiogroup" aria-label="Priority lens">
                {PRIORITY_LENS_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.id}
                    label={opt.label}
                    selected={priorityLens === opt.id}
                    onClick={() => setPriorityLens(opt.id)}
                  />
                ))}
              </div>
            </>
          )}

          {step === 'reminderStyle' && (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: 'var(--ws-ink)' }}>
                One last thing
              </h1>
              <p style={{ color: 'var(--ws-ink-muted)', marginBottom: 22, fontSize: 14 }}>How should WellSync nudge you about tasks?</p>
              <div role="radiogroup" aria-label="Reminder style">
                {REMINDER_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.id}
                    label={opt.label}
                    selected={reminderStyle === opt.id}
                    onClick={() => setReminderStyle(opt.id)}
                  />
                ))}
              </div>
            </>
          )}

          {error && (
            <p role="alert" style={{ color: 'var(--ws-high-text)', marginTop: 6, fontSize: 13, fontWeight: 600 }}>
              {error}
            </p>
          )}

          <button className="ws-button-block" disabled={saving} onClick={handleNext} style={{ marginTop: 26 }}>
            {stepIndex < STEPS.length - 1 ? 'Continue' : isEditing ? 'Save Changes' : "Let's go"}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
