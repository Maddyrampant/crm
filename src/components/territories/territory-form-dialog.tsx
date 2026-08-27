"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createTerritoryAction } from "@/actions/territories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

type Rule = { field: string; operator: string; value: string };

const fields = [
  { value: "city", label: "شهر" },
  { value: "province", label: "استان" },
  { value: "country", label: "کشور" },
  { value: "industry", label: "صنعت" },
];
const operators = [
  { value: "equals", label: "برابر است با" },
  { value: "contains", label: "شامل می‌شود" },
  { value: "starts_with", label: "شروع می‌شود با" },
];

export function TerritoryFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [rules, setRules] = useState<Rule[]>([{ field: "city", operator: "equals", value: "" }]);

  function addRule() {
    setRules((prev) => [...prev, { field: "city", operator: "equals", value: "" }]);
  }

  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRule(i: number, field: keyof Rule, value: string) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validRules = rules.filter((r) => r.value.trim());
    startTransition(async () => {
      const result = await createTerritoryAction({ name, rules: validRules.length > 0 ? validRules : undefined });
      if (result.ok) {
        toast.success("منطقه فروش ایجاد شد");
        setName("");
        setRules([{ field: "city", operator: "equals", value: "" }]);
        onSaved();
      } else {
        toast.error("خطا در ایجاد");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>منطقه فروش جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نام</Label>
            <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-3">
            <Label>قاعده‌ها</Label>
            {rules.map((rule, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={rule.field} onValueChange={(v) => updateRule(i, "field", v)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={rule.operator} onValueChange={(v) => updateRule(i, "operator", v)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {operators.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input dir="rtl" placeholder="مقدار" value={rule.value} onChange={(e) => updateRule(i, "value", e.target.value)} className="flex-1" />
                {rules.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeRule(i)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addRule}>
              <Plus className="size-4" />
              افزودن قاعده
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button type="submit" disabled={isPending}>ذخیره</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
