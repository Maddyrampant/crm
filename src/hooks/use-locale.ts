"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Locale = "fa" | "en";

const COOKIE_NAME = "locale";
const DEFAULT: Locale = "fa";

function readCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  const val = match?.[1];
  if (val === "fa" || val === "en") return val;
  return DEFAULT;
}

function writeCookie(locale: Locale) {
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}

let listeners: Array<() => void> = [];

function emitChange() {
  for (const l of listeners) l();
}

export function useLocale() {
  const locale = useSyncExternalStore(
    (cb) => {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((l) => l !== cb);
      };
    },
    readCookie,
    () => DEFAULT,
  );

  const setLocale = useCallback((l: Locale) => {
    writeCookie(l);
    emitChange();
    window.location.reload();
  }, []);

  return { locale: locale as Locale, setLocale };
}
