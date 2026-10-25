import { IonContent, IonPage, IonModal, IonIcon, useIonViewWillEnter } from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { pencilOutline, clipboardOutline, checkmarkDoneOutline, hourglassOutline, statsChartOutline, lockClosedOutline, personCircleOutline, chevronForwardOutline } from 'ionicons/icons';
import { auth } from '../services/firebase';
import { getProfile, getTasks } from '../services/storage';
import { usePlan } from '../contexts/PlanContext';
import { useTasksChanged } from '../contexts/TaskChangeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAvatar } from '../contexts/AvatarContext';
import { personaFor } from '../utils/persona';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
import EditProfile from '../components/EditProfile';
import ThemePicker from '../components/ThemePicker';
import Onboarding from './Onboarding';
import type { OnboardingProfile, Task } from '../types';

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
  const { plan, isPlus, subscribe, cancel, showPremium } = usePlan();
  const { avatarUrl } = useAvatar();
  const [editingProfile, setEditingProfile] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const { user } = useAuth();

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useIonViewWillEnter(() => {
    refresh();
  });

  // The global create button can add a task while this tab is showing.
  useTasksChanged(refresh);

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

  async function changePlan(action: 'subscribe' | 'cancel') {
    setPlanBusy(true);
    try {
      await (action === 'subscribe' ? subscribe() : cancel());
    } catch (err) {
      console.error('Failed to change plan', err);
    } finally {
      setPlanBusy(false);
    }
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const pending = total - completed;
  const completionRate = total ? (completed / total) * 100 : 0;
  const persona = personaFor(profile);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding ws-has-fab">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
          <button type="button" className="ws-avatar-btn" aria-label="Edit profile photo" onClick={() => setEditingProfile(true)}>
            <Avatar name={profile?.name ?? user?.email ?? ''} photoURL={avatarUrl} size={84} />
          </button>
          <div className="ws-profile-name">
            <h2>{profile?.name ?? 'Your profile'}</h2>
            <button type="button" className="ws-round-btn" aria-label="Edit name" onClick={() => setEditingProfile(true)}>
              <IonIcon icon={pencilOutline} style={{ fontSize: 14 }} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ws-ink-muted)', marginTop: 2 }}>{user?.email}</p>
          {persona && (
            <div className="ws-glass-card ws-persona">
              <span className="ws-persona__title">{persona.title}</span>
              <p>{persona.description}</p>
            </div>
          )}
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
          {isPlus ? (
            <button className="ws-section-header__link" onClick={() => setEditingPreferences(true)}>
              <IonIcon icon={pencilOutline} style={{ fontSize: 13, marginRight: 4 }} />
              Edit
            </button>
          ) : (
            <button
              className="ws-section-header__link"
              onClick={() => showPremium('Changing your preferences is part of WellSync Plus. It changes which frameworks fit you, so the free plan keeps them fixed.')}
            >
              <IonIcon icon={lockClosedOutline} style={{ fontSize: 13, marginRight: 4 }} />
              Plus
            </button>
          )}
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
          <h3>Plan</h3>
        </div>
        <div className="ws-glass-card" style={{ padding: '4px 18px', marginTop: 10 }}>
          <div className="ws-info-row">
            <span className="ws-info-row__label">WellSync Plus (demo)</span>
            <span className="ws-info-row__value">{plan === 'plus' ? 'Active' : 'Free'}</span>
          </div>
          <div className="ws-info-row">
            <span className="ws-info-row__label">Task assistant</span>
            <button
              className="ws-section-header__link"
              disabled={planBusy}
              onClick={() => (plan === 'plus' ? changePlan('cancel') : showPremium())}
            >
              {plan === 'plus' ? 'Cancel (demo)' : 'See Plus'}
            </button>
          </div>
        </div>

        <div className="ws-section-header" style={{ marginTop: 24 }}>
          <h3>Settings</h3>
        </div>

        <button type="button" className="ws-glass-card ws-settings-row" onClick={() => setEditingProfile(true)}>
          <IonIcon icon={personCircleOutline} />
          <span>
            <strong>Edit profile</strong>
            <small>Photo, name and password</small>
          </span>
          <IonIcon icon={chevronForwardOutline} className="ws-settings-row__chev" />
        </button>

        <p className="ws-field-label" style={{ marginTop: 16 }}>
          Theme
        </p>
        <ThemePicker />

        <button className="ws-button-google" style={{ marginTop: 24 }} onClick={() => signOut(auth)}>
          Sign Out
        </button>
      </IonContent>

      <IonModal isOpen={editingProfile} onDidDismiss={() => setEditingProfile(false)}>
        <EditProfile
          profile={profile}
          onNameSaved={(name) => setProfile((p) => (p ? { ...p, name } : p))}
          onClose={() => setEditingProfile(false)}
        />
      </IonModal>

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
