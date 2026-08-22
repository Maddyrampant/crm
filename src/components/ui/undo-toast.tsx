import { toast } from "sonner";

export function showUndoToast({
  message,
  onUndo,
}: {
  message: string;
  onUndo: () => void;
}) {
  toast(message, {
    duration: 8000,
    action: {
      label: "بازیابی",
      onClick: onUndo,
    },
  });
}
