import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { Redirect, Route, useLocation } from 'react-router-dom';
import { homeOutline, clipboardOutline, calendarOutline, personOutline, gridOutline } from 'ionicons/icons';
import { signOut } from 'firebase/auth';

import Dashboard from './pages/Dashboard';
import TaskSchedule from './pages/TaskSchedule';
import Projects from './pages/Projects';
import Frameworks from './pages/Frameworks';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { TaskChangeProvider } from './contexts/TaskChangeContext';
import { PlanProvider } from './contexts/PlanContext';
import { AvatarProvider } from './contexts/AvatarContext';
import CreateMenu from './components/CreateMenu';
import { auth } from './services/firebase';
import { getProfile } from './services/storage';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './theme/variables.css';

setupIonicReact();

const TAB_ORDER = ['/home', '/projects', '/calendar', '/frameworks', '/profile'];

/** Tells the CSS which way the user moved along the tab bar, so the incoming page slides in from that side. */
function TabDirection() {
  const { pathname } = useLocation();
  const previous = useRef(TAB_ORDER.indexOf(pathname));
  useLayoutEffect(() => {
    const next = TAB_ORDER.indexOf(pathname);
    if (next >= 0) {
      document.documentElement.dataset.tabDir = next < previous.current ? 'back' : 'forward';
      previous.current = next;
    }
  }, [pathname]);
  return null;
}

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
        <PomodoroProvider>
          <TaskChangeProvider>
            <TabDirection />
            <IonTabs>
              <IonRouterOutlet>
                <Route exact path="/home" component={Dashboard} />
                <Route exact path="/projects" component={Projects} />
                <Route exact path="/calendar" component={TaskSchedule} />
                <Route exact path="/frameworks" component={Frameworks} />
                <Route exact path="/profile" component={Profile} />
                <Route exact path="/">
                  <Redirect to="/home" />
                </Route>
              </IonRouterOutlet>
              <IonTabBar slot="bottom" id="ws-tab-bar">
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
                <IonTabButton tab="frameworks" href="/frameworks">
                  <IonIcon icon={gridOutline} />
                  <IonLabel>Frameworks</IonLabel>
                </IonTabButton>
                <IonTabButton tab="profile" href="/profile">
                  <IonIcon icon={personOutline} />
                  <IonLabel>Profile</IonLabel>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>
            <CreateMenu />
          </TaskChangeProvider>
        </PomodoroProvider>
      )}
    </IonReactRouter>
  );
}

export default function App() {
  return (
    <IonApp>
      <AuthProvider>
        <PlanProvider>
          <AvatarProvider>
            <ThemeProvider>
              <AppShell />
            </ThemeProvider>
          </AvatarProvider>
        </PlanProvider>
      </AuthProvider>
    </IonApp>
  );
}
