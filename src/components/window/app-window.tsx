"use client";

import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Minus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowStore, type WindowState } from "@/store/window-store";
import { WindowContextMenu } from "./window-context-menu";

type Props = {
  win: WindowState;
};

type Interaction =
  | {
      type: "move";
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    }
  | {
      type: "resize";
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
      dir: string;
    };

export function AppWindow({ win }: Props) {
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const resizeWindow = useWindowStore((s) => s.resizeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const resetWindow = useWindowStore((s) => s.resetWindow);

  const interaction = useRef<Interaction | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const onPointerDownTitle = (e: React.PointerEvent<HTMLDivElement>) => {
    if (win.maximized) return;
    if ((e.target as HTMLElement).closest("[data-window-control]")) return;
    interaction.current = {
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    };
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const onStartResize = (e: React.PointerEvent<HTMLDivElement>, dir: string) => {
    if (win.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    interaction.current = {
      type: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      origW: win.width,
      origH: win.height,
      dir,
    };
  };

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const it = interaction.current;
      if (!it || win.maximized) return;

      if (it.type === "move") {
        const dx = e.clientX - it.startX;
        const dy = e.clientY - it.startY;
        const nx = Math.max(0, Math.min(it.origX + dx, window.innerWidth - 60));
        const ny = Math.max(0, Math.min(it.origY + dy, window.innerHeight - 40));
        moveWindow(win.id, nx, ny);
      } else {
        const dx = e.clientX - it.startX;
        const dy = e.clientY - it.startY;
        let nw = it.origW;
        let nh = it.origH;
        let nx = it.origX;
        let ny = it.origY;

        if (it.dir.includes("e")) nw = Math.max(win.minWidth, it.origW + dx);
        if (it.dir.includes("s")) nh = Math.max(win.minHeight, it.origH + dy);
        if (it.dir.includes("w")) {
          nw = Math.max(win.minWidth, it.origW - dx);
          nx = it.origX + (it.origW - nw);
        }
        if (it.dir.includes("n")) {
          nh = Math.max(win.minHeight, it.origH - dy);
          ny = it.origY + (it.origH - nh);
        }
        resizeWindow(win.id, nw, nh, nx, ny);
      }
    }

    function onPointerUp() {
      interaction.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [win.id, win.maximized, win.minWidth, win.minHeight, win.x, win.y, win.width, win.height, moveWindow, resizeWindow]);

  if (win.minimized) return null;

  const isActive = useActiveWindow(win.id);

  const resizeHandles = [
    ["n", "top-0 left-0 right-0 h-1.5"],
    ["s", "bottom-0 left-0 right-0 h-1.5"],
    ["e", "right-0 top-0 bottom-0 w-1.5"],
    ["w", "left-0 top-0 bottom-0 w-1.5"],
    ["se", "bottom-0 right-0 size-3.5"],
    ["sw", "bottom-0 left-0 size-3.5"],
    ["ne", "top-0 right-0 size-3.5"],
    ["nw", "top-0 left-0 size-3.5"],
  ] as const;

  return (
    <div
      data-window-id={win.id}
      data-focused={isActive ? "true" : "false"}
      onPointerDown={() => focusWindow(win.id)}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-lg border bg-background shadow-xl",
        isActive ? "ring-1 ring-ring/30" : "opacity-95"
      )}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.z,
      }}
    >
      <div
        data-window-titlebar
        onPointerDown={onPointerDownTitle}
        onContextMenu={onContextMenu}
        className="flex h-9 shrink-0 cursor-grab touch-none select-none items-center justify-between border-b bg-muted/40 px-3"
      >
        <div className="flex min-w-0 items-center gap-2">
          {win.icon}
          <span className="truncate text-sm font-medium">{win.title}</span>
        </div>
        <div className="flex items-center gap-0.5" data-window-control>
          <TitleButton title="تازه‌سازی" onClick={() => resetWindow(win.id)}>
            <RotateCcw className="size-3.5" />
          </TitleButton>
          <TitleButton
            title={win.maximized ? "بازگردانی" : "بزرگ‌نمایی"}
            onClick={() => toggleMaximize(win.id)}
          >
            {win.maximized ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </TitleButton>
          <TitleButton title="کوچک‌نمایی" onClick={() => minimizeWindow(win.id)}>
            <Minus className="size-3.5" />
          </TitleButton>
          <TitleButton
            title="بستن"
            className="hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => closeWindow(win.id)}
          >
            <X className="size-3.5" />
          </TitleButton>
        </div>
      </div>

      {!win.maximized && (
        <div className="pointer-events-none absolute inset-0">
          {resizeHandles.map(([dir, pos]) => (
            <div
              key={dir}
              data-resize={dir}
              onPointerDown={(e) => onStartResize(e, dir)}
              className="pointer-events-auto absolute"
              style={{ cursor: `${dir}-resize` }}
            >
              <span className={cn("absolute", pos)} />
            </div>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">{win.content}</div>

      {menu && (
        <WindowContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onMinimize={() => {
            minimizeWindow(win.id);
            setMenu(null);
          }}
          onToggleMaximize={() => {
            toggleMaximize(win.id);
            setMenu(null);
          }}
          onReset={() => {
            resetWindow(win.id);
            setMenu(null);
          }}
          onRefresh={() => setMenu(null)}
          onCloseWindow={() => {
            closeWindow(win.id);
            setMenu(null);
          }}
          maximized={win.maximized}
        />
      )}
    </div>
  );
}

function useActiveWindow(id: string) {
  const isActive = useWindowStore((s) => {
    const maxZ = Math.max(0, ...s.windows.map((w) => (w.minimized ? -1 : w.z)));
    const w = s.windows.find((x) => x.id === id);
    return w ? w.z === maxZ : false;
  });
  return isActive;
}

function TitleButton({
  title,
  onClick,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
