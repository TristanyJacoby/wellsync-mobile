import { useIonToast } from '@ionic/react';

const UNDO_WINDOW_MS = 8000;

/**
 * Short toast with an Undo button, for actions a tap can trigger by
 * accident (marking done, deleting). Showing a new one replaces the last.
 */
export function useUndoToast() {
  const [present, dismiss] = useIonToast();

  return async (message: string, onUndo: () => void | Promise<void>) => {
    await dismiss();
    await present({
      message,
      duration: UNDO_WINDOW_MS,
      position: 'bottom',
      positionAnchor: 'ws-tab-bar',
      cssClass: 'ws-undo-toast',
      buttons: [{ text: 'Undo', role: 'cancel', handler: () => void onUndo() }],
    });
  };
}
