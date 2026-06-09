import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: ", r);
    },
    onRegisterError(error) {
      console.warn("SW registration error", error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  // Only show the refresh prompt if a new SW is waiting
  if (!needRefresh) {
    return null;
  }

  return (
    <div className="reload-prompt-container glass">
      <div className="reload-prompt-content">
        <div className="reload-prompt-icon">🚀</div>
        <div className="reload-prompt-message">
          <div className="message-title">Update Available</div>
          <div className="message-desc">
            A new version of MVET Songbook is available.
          </div>
        </div>
      </div>
      <div className="reload-prompt-actions">
        <button
          className="sync-btn prompt-update-btn"
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          Upgrade Now
        </button>
        <button className="prompt-close-btn" onClick={close}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ReloadPrompt;
