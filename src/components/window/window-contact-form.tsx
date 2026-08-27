"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { useWindowStore } from "@/store/window-store";
import { ContactFormBody } from "@/components/contacts/contact-form-dialog";
import { getContactFormDataAction } from "@/actions/contact-form-data";
import type { ContactRow, CustomFieldRow } from "@/lib/api-types";

export const CONTACT_FORM_WINDOW_ID = "contact-form";

type FormData = {
  companies: { id: string; name: string }[];
  members: { id: string; name: string; email: string }[];
  customFields: CustomFieldRow[];
};

export function WindowContactForm({
  render,
  data,
}: {
  render?: (open: () => void) => React.ReactNode;
  data?: FormData;
}) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const router = useRouter();

  const open = () =>
    openWindow({
      id: CONTACT_FORM_WINDOW_ID,
      title: "مشتری جدید",
      icon: <UserPlus className="size-4 text-primary" />,
      content: (
        <ContactFormWindowContent
          initialData={data}
          onDone={() => {
            closeWindow(CONTACT_FORM_WINDOW_ID);
            router.refresh();
          }}
        />
      ),
      width: 560,
      height: 620,
      minWidth: 420,
      minHeight: 460,
    });

  if (render) return render(open);

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex items-center gap-1.5 text-sm font-medium"
    >
      <UserPlus className="size-4" />
      مشتری جدید
    </button>
  );
}

function ContactFormWindowContent({
  initialData,
  onDone,
}: {
  initialData?: FormData;
  onDone: () => void;
}) {
  const [data, setData] = useState<FormData | null>(initialData ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialData) return;
    let mounted = true;
    getContactFormDataAction().then((d) => {
      if (!mounted) return;
      setData(d);
    }).catch(() => {
      if (mounted) setError(true);
    });
    return () => {
      mounted = false;
    };
  }, [initialData]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        خطا در دریافت اطلاعات فرم
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <ContactFormBody
        companies={data.companies}
        members={data.members}
        customFields={data.customFields}
        onSaved={(_c: ContactRow) => onDone()}
        onCancel={onDone}
      />
    </div>
  );
}
