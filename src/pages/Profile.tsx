import { IonContent, IonPage, IonModal, IonIcon, useIonViewWillEnter } from '@ionic/react';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { pencilOutline, clipboardOutline, checkmarkDoneOutline, hourglassOutline, statsChartOutline } from 'ionicons/icons';
import { auth } from '../services/firebase';
import { getProfile, getTasks } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import StatCard from '../components/StatCard';
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
  const { user } = useAuth();

  useIonViewWillEnter(() => {
    refresh();
  });

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

        <div className="ws-stat-carousel">
          <StatCard
            icon={statsChartOutline}
            label="Completion Rate"
            value={`${Math.round(completionRate)}%`}
            percent={completionRate}
            bg="var(--ws-amber-dim)"
            text="var(--ws-amber-strong)"
          />
          <StatCard
            icon={clipboardOutline}
            label={`Total Task${total === 1 ? '' : 's'}`}
            value={total}
            percent={100}
            bg="var(--ws-inreview-bg)"
            text="var(--ws-inreview-text)"
          />
          <StatCard
            icon={checkmarkDoneOutline}
            label="Completed"
            value={completed}
            percent={completionRate}
            bg="var(--ws-done-bg)"
            text="var(--ws-done-text)"
          />
          <StatCard
            icon={hourglassOutline}
            label="Pending"
            value={pending}
            percent={total ? (pending / total) * 100 : 0}
            bg="var(--ws-medium-bg)"
            text="var(--ws-medium-text)"
          />
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
