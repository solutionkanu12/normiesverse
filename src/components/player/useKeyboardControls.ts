"use client";

/**
 * useKeyboardControls — tracks movement keys in a ref (no re-renders).
 * WASD / arrows to move, Shift to sprint, Space to jump.
 */
import { useEffect, useRef } from "react";

export interface MoveState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
}

const KEY_MAP: Record<string, keyof MoveState> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  Space: "jump",
};

export function useKeyboardControls() {
  const state = useRef<MoveState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
  });

  useEffect(() => {
    const set = (code: string, value: boolean) => {
      const key = KEY_MAP[code];
      if (key) state.current[key] = value;
    };
    const onDown = (e: KeyboardEvent) => {
      if (KEY_MAP[e.code]) {
        // Stop Space/Arrows from scrolling the page while playing.
        if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
        set(e.code, true);
      }
    };
    const onUp = (e: KeyboardEvent) => set(e.code, false);

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return state;
}
