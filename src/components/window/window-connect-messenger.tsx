"use client";

import { MessageSquarePlus } from "lucide-react";
import { useWindowStore } from "@/store/window-store";
import { MessengerConnectFormBody } from "@/components/messenger/messenger-connect-form";

export const MESSENGER_FORM_WINDOW_ID = "messenger-connect";

export function WindowConnectMessenger({
  render,
}: {
  render?: (open: () => void) => React.ReactNode;
}) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);

  const open = () =>
    openWindow({
      id: MESSENGER_FORM_WINDOW_ID,
      title: "اتصال پیام‌رسان جدید",
      icon: <MessageSquarePlus className="size-4 text-primary" />,
      content: (
        <div className="h-full p-4">
          <MessengerConnectFormBody onDone={() => closeWindow(MESSENGER_FORM_WINDOW_ID)} />
        </div>
      ),
      width: 460,
      height: 480,
      minWidth: 380,
      minHeight: 420,
    });

  if (render) return render(open);

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex items-center gap-1.5 text-sm font-medium"
    >
      <MessageSquarePlus className="size-4" />
      اتصال جدید
    </button>
  );
}
