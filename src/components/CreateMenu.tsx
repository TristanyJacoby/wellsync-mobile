import { IonModal } from '@ionic/react';
import { useState } from 'react';
import AddTask from '../pages/AddTask';
import AssistantSheet from './AssistantSheet';
import HomeFab from './HomeFab';
import { useTaskChange } from '../contexts/TaskChangeContext';

/** The always-available create button with the sheets it opens. Mounted once, above the tabs. */
export default function CreateMenu() {
  const { notifyTasksChanged } = useTaskChange();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  return (
    <>
      <HomeFab onCreateTask={() => setShowAddTask(true)} onOpenAssistant={() => setShowAssistant(true)} />

      <IonModal isOpen={showAddTask} onDidDismiss={() => setShowAddTask(false)}>
        <AddTask
          onClose={() => {
            setShowAddTask(false);
            notifyTasksChanged();
          }}
        />
      </IonModal>

      <AssistantSheet isOpen={showAssistant} onClose={() => setShowAssistant(false)} onCreated={notifyTasksChanged} />
    </>
  );
}
