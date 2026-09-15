import { useEffect, useState } from 'react';
import {
  IonApp,
  IonPage,
  IonContent,
  IonButton,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { homeOutline, clipboardOutline, calendarOutline, personOutline } from 'ionicons/icons';
import { signOut } from 'firebase/auth';

import Dashboard from './pages/Dashboard';
import TaskSchedule from './pages/TaskSchedule';
import Projects from './pages/Projects';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth } from './services/firebase';
import { getProfile } from './services/storage';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './theme/variables.css';

setupIonicReact();

function AppShell() {
  const { user, checkingAuth } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // getProfile() reads from Firestore scoped to the signed-in user, so it
  // can only run once we actually have one - and needs to re-run whenever
  // the signed-in user changes (sign out, then a different account signs in).
  useEffect(() => {
    if (!user) {
      setOnboarded(false);
      setCheckingProfile(false);
      setProfileError(null);
      return;
    }
    setCheckingProfile(true);
    setProfileError(null);
    getProfile()
      .then((profile) => {
        setOnboarded(!!profile?.completedOnboarding);
        setCheckingProfile(false);
      })
      .catch((err) => {
        // Without this catch, a rejected Firestore read (bad rules, offline,
        // etc.) left checkingProfile stuck true forever - an eternal blank
        // screen with no way out except reloading the page.
        console.error('Failed to load profile from Firestore', err);
        setProfileError(err instanceof Error ? err.message : 'Failed to load your data.');
        setCheckingProfile(false);
      });
  }, [user]);

  if (checkingAuth || (user && checkingProfile)) return null;

  if (profileError) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-padding">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40 }}>Couldn't load your data</h2>
          <p style={{ color: 'var(--ws-ink-muted, #888)' }}>{profileError}</p>
          <p style={{ fontSize: 13, color: 'var(--ws-ink-faint, #999)' }}>
            This usually means Firestore's security rules haven't been published yet in the Firebase console.
          </p>
          <IonButton expand="block" style={{ marginTop: 16 }} onClick={() => signOut(auth)}>
            Sign Out
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonReactRouter>
      {!user ? (
        <Auth />
      ) : !onboarded ? (
        <Onboarding onComplete={() => setOnboarded(true)} />
      ) : (
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/home" component={Dashboard} />
            <Route exact path="/projects" component={Projects} />
            <Route exact path="/calendar" component={TaskSchedule} />
            <Route exact path="/profile" component={Profile} />
            <Route exact path="/">
              <Redirect to="/home" />
            </Route>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon icon={homeOutline} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="projects" href="/projects">
              <IonIcon icon={clipboardOutline} />
              <IonLabel>Projects</IonLabel>
            </IonTabButton>
            <IonTabButton tab="calendar" href="/calendar">
              <IonIcon icon={calendarOutline} />
              <IonLabel>Calendar</IonLabel>
            </IonTabButton>
            <IonTabButton tab="profile" href="/profile">
              <IonIcon icon={personOutline} />
              <IonLabel>Profile</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      )}
    </IonReactRouter>
  );
}

export default function App() {
  return (
    <IonApp>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </IonApp>
  );
}
