"use client";

import { create } from "zustand";
import type { ReactNode } from "react";

export type WindowSize = {
  width: number;
  height: number;
};

export type WindowState = {
  id: string;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
};

type OpenWindowInput = {
  id: string;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
};

type WindowStore = {
  windows: WindowState[];
  zCounter: number;
  openWindow: (input: OpenWindowInput) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number, x?: number, y?: number) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  resetWindow: (id: string) => void;
};

const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 480;
const PADDING = 24;

function cascadePosition(index: number, winWidth: number, winHeight: number) {
  if (typeof window === "undefined") {
    return { x: PADDING, y: PADDING };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const offset = (index % 8) * 28;
  const baseX = Math.max(PADDING, (vw - winWidth) / 2 + offset);
  const baseY = Math.max(PADDING, (vh - winHeight) / 2 + offset);
  const boundedX = Math.min(baseX, Math.max(PADDING, vw - winWidth - PADDING));
  const boundedY = Math.min(baseY, Math.max(PADDING, vh - winHeight - PADDING));
  return { x: boundedX, y: boundedY };
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  zCounter: 100,

  openWindow: (input) => {
    const existing = get().windows.find((w) => w.id === input.id);
    if (existing) {
      get().focusWindow(input.id);
      return;
    }

    const winWidth = input.width ?? DEFAULT_WIDTH;
    const winHeight = input.height ?? DEFAULT_HEIGHT;
    const { x, y } = cascadePosition(get().windows.length, winWidth, winHeight);
    const nextZ = get().zCounter + 1;

    set((s) => ({
      zCounter: nextZ,
      windows: [
        ...s.windows,
        {
          id: input.id,
          title: input.title,
          icon: input.icon,
          content: input.content,
          x: input.x ?? x,
          y: input.y ?? y,
          width: winWidth,
          height: winHeight,
          minWidth: input.minWidth ?? 320,
          minHeight: input.minHeight ?? 200,
          z: nextZ,
          minimized: false,
          maximized: false,
        },
      ],
    }));
  },

  closeWindow: (id) => {
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }));
  },

  focusWindow: (id) => {
    const nextZ = get().zCounter + 1;
    set((s) => ({
      zCounter: nextZ,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, z: nextZ, minimized: false } : w
      ),
    }));
  },

  moveWindow: (id, x, y) => {
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }));
  },

  resizeWindow: (id, width, height, x, y) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id
          ? { ...w, width, height, ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) }
          : w
      ),
    }));
  },

  minimizeWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w
      ),
    }));
  },

  toggleMaximize: (id) => {
    const win = get().windows.find((w) => w.id === id);
    if (!win) return;
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized } : w
      ),
    }));
  },

  resetWindow: (id) => {
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id
          ? { ...w, maximized: false, ...cascadePosition(0, w.width, w.height) }
          : w
      ),
    }));
  },
}));
