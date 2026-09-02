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
