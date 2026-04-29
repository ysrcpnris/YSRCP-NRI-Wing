import { useEffect, useRef, useState } from "react";

// useIdleLogout — signs the user out after `idleMs` of no input, and exposes
// a `showWarning` flag that flips to true `warningLeadMs` before the logout
// fires (so callers can render a "session expiring" toast or modal). Any
// pointer / key / scroll / focus event resets the timer.
//
// Used by every authenticated dashboard so screen-timeout behaviour stays
// consistent everywhere (1-hour idle, 5-min warning by default).
export function useIdleLogout(opts: {
  enabled: boolean;
  idleMs?: number;
  warningLeadMs?: number;
  onLogout: () => void | Promise<void>;
}) {
  const { enabled, onLogout } = opts;
  const idleMs       = opts.idleMs       ?? 60 * 60 * 1000;       // 1 hour
  const warningLeadMs = opts.warningLeadMs ?? 5 * 60 * 1000;       // 5 min before

  const [showWarning, setShowWarning] = useState(false);
  const idleRef    = useRef<number | null>(null);
  const warnRef    = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (idleRef.current) window.clearTimeout(idleRef.current);
      if (warnRef.current) window.clearTimeout(warnRef.current);
      setShowWarning(false);

      warnRef.current = window.setTimeout(() => {
        setShowWarning(true);
      }, Math.max(0, idleMs - warningLeadMs));

      idleRef.current = window.setTimeout(() => {
        // We swallow errors so a flaky network on logout doesn't keep the
        // user "logged in" longer than their idle window.
        Promise.resolve(onLogout()).catch(() => { /* ignore */ });
      }, idleMs);
    };

    // Activity events that cancel the countdown.
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "focus",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (idleRef.current) window.clearTimeout(idleRef.current);
      if (warnRef.current) window.clearTimeout(warnRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, idleMs, warningLeadMs, onLogout]);

  const dismissWarning = () => setShowWarning(false);

  return { showWarning, dismissWarning };
}
