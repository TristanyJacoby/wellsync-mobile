import { IonContent, IonPage, IonModal, IonIcon, useIonViewWillEnter } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { pencilOutline, clipboardOutline, checkmarkDoneOutline, hourglassOutline, statsChartOutline } from 'ionicons/icons';
import { auth } from '../services/firebase';
import { getProfile, getTasks } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
import Onboarding from './Onboarding';
import type { OnboardingProfile, Task, Theme } from '../types';

const THEME_OPTIONS: { id: Theme; label: string; swatch: string }[] = [
  { id: 'dark', label: 'Dark', swatch: 'linear-gradient(135deg, #16212e 0%, #1f2f45 50%, #28405e 100%)' },
  { id: 'light', label: 'Light', swatch: 'linear-gradient(135deg, #fce9d8 0%, #f6dce3 45%, #e3d6f2 100%)' },
];

const WORK_STYLE_LABEL: Record<string, string> = {
  planner: 'Plans ahead of time',
  'deadline-driven': 'Works best close to deadlines',
  spontaneous: 'Goes with whatever feels urgent',
};

const PRIORITY_LENS_LABEL: Record<string, string> = {
  urgency: "Whatever's due soonest",
  importance: 'Whatever matters most',
  effort: "Whatever's quickest to finish",
};

const REMINDER_LABEL: Record<string, string> = {
  early: 'Well in advance',
  'last-minute': 'Right before due',
  'self-check': 'Checks app themself',
};

export default function Profile() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useIonViewWillEnter(() => {
    refresh();
  });

  // Tracks which StatCard is most centered within the horizontally-scrolling
  // carousel, so the CSS can scale/brighten it and dim the rest - gives the
  // scroll a tactile "snap into focus" feel instead of a flat strip of cards.
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));
        let bestIndex = 0;
        let bestRatio = -1;
        cards.forEach((card, i) => {
          const ratio = ratios.get(card) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = i;
          }
        });
        setFocusedIndex(bestIndex);
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  function refresh() {
    getProfile().then(setProfile);
    getTasks().then(setTasks);
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const pending = total - completed;
  const completionRate = total ? (completed / total) * 100 : 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
          <Avatar name={profile?.name ?? user?.email ?? ''} photoURL={user?.photoURL} size={84} />
          <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>{profile?.name ?? 'Your profile'}</h2>
          <p style={{ fontSize: 13, color: 'var(--ws-ink-muted)', marginTop: 2 }}>{user?.email}</p>
        </div>

        <div className="ws-stat-carousel" ref={carouselRef}>
          <div className={`ws-stat-carousel__item${focusedIndex === 0 ? ' is-focused' : ''}`}>
            <StatCard
              icon={statsChartOutline}
              label="Completion Rate"
              value={`${Math.round(completionRate)}%`}
              percent={completionRate}
              bg="var(--ws-amber-dim)"
              text="var(--ws-amber-strong)"
            />
          </div>
          <div className={`ws-stat-carousel__item${focusedIndex === 1 ? ' is-focused' : ''}`}>
            <StatCard
              icon={clipboardOutline}
              label={`Total Task${total === 1 ? '' : 's'}`}
              value={total}
              percent={100}
              bg="var(--ws-inreview-bg)"
              text="var(--ws-inreview-text)"
            />
          </div>
          <div className={`ws-stat-carousel__item${focusedIndex === 2 ? ' is-focused' : ''}`}>
            <StatCard
              icon={checkmarkDoneOutline}
              label="Completed"
              value={completed}
              percent={completionRate}
              bg="var(--ws-done-bg)"
              text="var(--ws-done-text)"
            />
          </div>
          <div className={`ws-stat-carousel__item${focusedIndex === 3 ? ' is-focused' : ''}`}>
            <StatCard
              icon={hourglassOutline}
              label="Pending"
              value={pending}
              percent={total ? (pending / total) * 100 : 0}
              bg="var(--ws-medium-bg)"
              text="var(--ws-medium-text)"
            />
          </div>
        </div>

        <div className="ws-section-header">
          <h3>Preferences</h3>
          <button className="ws-section-header__link" onClick={() => setEditingPreferences(true)}>
            <IonIcon icon={pencilOutline} style={{ fontSize: 13, marginRight: 4 }} />
            Edit
          </button>
        </div>

        <div className="ws-glass-card" style={{ padding: '4px 18px', marginTop: 10 }}>
          <div className="ws-info-row">
            <span className="ws-info-row__label">Work style</span>
            <span className="ws-info-row__value">
              {(profile?.workStyle && WORK_STYLE_LABEL[profile.workStyle]) || 'Not set'}
            </span>
          </div>
          <div className="ws-info-row">
            <span className="ws-info-row__label">Priority lens</span>
            <span className="ws-info-row__value">
              {(profile?.priorityLens && PRIORITY_LENS_LABEL[profile.priorityLens]) || 'Not set'}
            </span>
          </div>
          <div className="ws-info-row">
            <span className="ws-info-row__label">Reminder style</span>
            <span className="ws-info-row__value">
              {(profile?.reminderStyle && REMINDER_LABEL[profile.reminderStyle]) || 'Not set'}
            </span>
          </div>
        </div>

        <div className="ws-section-header" style={{ marginTop: 24 }}>
          <h3>Appearance</h3>
        </div>

        <div className="ws-theme-row">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`ws-theme-option${theme === opt.id ? ' is-selected' : ''}`}
              onClick={() => setTheme(opt.id)}
              aria-pressed={theme === opt.id}
            >
              <span className="ws-theme-option__swatch" style={{ background: opt.swatch }} />
              {opt.label}
            </button>
          ))}
        </div>

        <button className="ws-button-google" style={{ marginTop: 24 }} onClick={() => signOut(auth)}>
          Sign Out
        </button>
      </IonContent>

      <IonModal isOpen={editingPreferences} onDidDismiss={() => setEditingPreferences(false)}>
        {profile && (
          <Onboarding
            initialProfile={profile}
            onCancel={() => setEditingPreferences(false)}
            onComplete={() => {
              setEditingPreferences(false);
              refresh();
            }}
          />
        )}
      </IonModal>
    </IonPage>
  );
}
