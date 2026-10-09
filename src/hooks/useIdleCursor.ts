import { useEffect } from "react";

const IDLE_MS = 3000;

/** Hides the mouse cursor after a few seconds without movement, or as soon as a key is pressed. */
export function useIdleCursor() {
  useEffect(() => {
    let timer: number | undefined;

    const hide = () => document.body.classList.add("cursor-hidden");
    const show = () => {
      document.body.classList.remove("cursor-hidden");
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, IDLE_MS);
    };

    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("keydown", hide);

    return () => {
      window.removeEventListener("mousemove", show);
      window.removeEventListener("keydown", hide);
      window.clearTimeout(timer);
    };
  }, []);
}