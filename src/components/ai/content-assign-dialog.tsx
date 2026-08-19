"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignContentAction } from "@/actions/ai-content";
import type { AiContent } from "@/db/schema/ai-content";

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: AiContent;
  contacts: ContactOption[];
};

export function ContentAssignDialog({
  open,
  onOpenChange,
  content,
  contacts,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) {
      toast.error("یک مخاطب انتخاب کنید");
      return;
    }
    setLoading(true);
    const result = await assignContentAction({
      contentId: content.id,
      contactId,
      notes,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error ?? "خطا در تخصیص");
      return;
    }
    toast.success("محتوا تخصیص یافت");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تخصیص محتوا</DialogTitle>
            <DialogDescription>
              تخصیص «{content.title}» به یک مخاطب
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>مخاطب</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب مخاطب..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName ?? ""}
                      {c.email ? ` (${c.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>توضیحات (اختیاری)</Label>
              <Textarea
                dir="rtl"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="این محتوا برای..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              تخصیص
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
