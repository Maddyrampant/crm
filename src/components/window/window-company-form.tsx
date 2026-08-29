"use client";

import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { useWindowStore } from "@/store/window-store";
import { CompanyFormBody } from "@/components/companies/company-form-dialog";

export const COMPANY_FORM_WINDOW_ID = "company-form";

export function WindowCompanyForm({
  render,
}: {
  render?: (open: () => void) => React.ReactNode;
}) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const router = useRouter();

  const open = () =>
    openWindow({
      id: COMPANY_FORM_WINDOW_ID,
      title: "شرکت جدید",
      icon: <Building2 className="size-4 text-primary" />,
      content: (
        <div className="h-full p-4">
          <CompanyFormBody
            onSaved={() => {
              closeWindow(COMPANY_FORM_WINDOW_ID);
              router.refresh();
            }}
            onCancel={() => closeWindow(COMPANY_FORM_WINDOW_ID)}
          />
        </div>
      ),
      width: 520,
      height: 560,
      minWidth: 400,
      minHeight: 420,
    });

  if (render) return render(open);

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex items-center gap-1.5 text-sm font-medium"
    >
      <Plus className="size-4" />
      شرکت جدید
    </button>
  );
}