import { useEffect, useRef } from "react";
import { runtime } from "../telegram";

interface Action {
  text: string;
  disabled?: boolean;
  onClick: () => void;
}

export function useTelegramChrome(back: (() => void) | undefined, action: Action | null) {
  const backRef = useRef(back);
  const actionRef = useRef(action);
  backRef.current = back;
  actionRef.current = action;

  useEffect(() => {
    if (!runtime.inTelegram) return;
    let stop = false;
    let offBack = () => {};
    let offMain = () => {};
    void import("@telegram-apps/sdk-react").then((sdk) => {
      if (stop) return;
      if (backRef.current && sdk.backButton.show.isAvailable()) {
        sdk.backButton.show();
        offBack = sdk.backButton.onClick(() => backRef.current?.());
      } else if (sdk.backButton.hide.isAvailable()) {
        sdk.backButton.hide();
      }
      const current = actionRef.current;
      if (current && sdk.mainButton.setParams.isAvailable()) {
        sdk.mainButton.setParams({ text: current.text, isVisible: true, isEnabled: !current.disabled });
        offMain = sdk.mainButton.onClick(() => actionRef.current?.onClick());
      } else if (sdk.mainButton.setParams.isAvailable()) {
        sdk.mainButton.setParams({ isVisible: false });
      }
    });
    return () => {
      stop = true;
      offBack();
      offMain();
    };
  }, [Boolean(back), action?.text, action?.disabled]);
}

export function Mark({ color, label }: { color: string; label: string }) {
  return (
    <span className="mark" style={{ background: color }}>
      {label.slice(0, 2)}
    </span>
  );
}

export function ActionBar({ text, disabled, onClick }: Action) {
  if (runtime.inTelegram) return null;
  return (
    <div className="action-bar">
      <button type="button" disabled={disabled} onClick={onClick}>
        {text}
      </button>
    </div>
  );
}
