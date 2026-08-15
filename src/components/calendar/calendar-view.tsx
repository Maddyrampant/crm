"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  getDay,
  isSameDay,
  startOfMonth,
} from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { ChevronRight, ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createAppointmentAction,
  createTaskAction,
  deleteAppointmentAction,
  updateTaskStatusAction,
} from "@/actions/calendar";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Appointment, Task } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Customer = { id: string; name: string };

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const typeColors: Record<Appointment["type"], string> = {
  meeting: "bg-blue-500",
  call: "bg-emerald-500",
  follow_up: "bg-amber-500",
  demo: "bg-violet-500",
  other: "bg-slate-500",
};

const typeLabels: Record<Appointment["type"], string> = {
  meeting: "جلسه",
  call: "تماس",
  follow_up: "پیگیری",
  demo: "دمو",
  other: "سایر",
};

export function CalendarView({
  appointments,
  tasks,
  customers,
}: {
  appointments: Appointment[];
  tasks: Task[];
  customers: Customer[];
}) {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    contactId: "",
    type: "meeting" as Appointment["type"],
    time: "10:00",
  });
  const [taskTitle, setTaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const grid = useMemo(() => {
    const first = startOfMonth(month);
    const leading = (getDay(first) + 1) % 7;
    const days = getDaysInMonth(month);
    const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
    for (let i = 0; i < days; i++) {
      cells.push(addDays(first, i));
    }
    return cells;
  }, [month]);

  const monthTitle = format(month, "MMMM yyyy", { locale: faIR });

  function handleDayClick(day: Date | null) {
    if (!day) return;
    setSelectedDay(day);
    setAppointmentForm((f) => ({ ...f, title: "", contactId: "" }));
  }

  async function saveAppointment() {
    if (!selectedDay || !appointmentForm.title.trim()) {
      toast.error("عنوان قرار را وارد کنید");
      return;
    }
    const [h, m] = appointmentForm.time.split(":").map(Number);
    const startsAt = new Date(selectedDay);
    startsAt.setHours(h, m, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setHours(h + 1, m, 0, 0);

    setSaving(true);
    const res = await createAppointmentAction({
      title: appointmentForm.title.trim(),
      contactId: appointmentForm.contactId || null,
      type: appointmentForm.type,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("قرار ثبت شد");
      setSelectedDay(null);
      window.location.reload();
    } else {
      toast.error("خطا در ثبت قرار");
    }
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    const res = await createTaskAction({ title: taskTitle.trim() });
    if (res.ok) {
      toast.success("تسک ساخته شد");
      setTaskTitle("");
      window.location.reload();
    }
  }

  async function toggleTask(task: Task) {
    await updateTaskStatusAction(
      task.id,
      task.status === "done" ? "open" : "done"
    );
    window.location.reload();
  }

  const todayAppointments = appointments
    .filter((a) => isSameDay(a.startsAt, new Date()))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const openTasks = tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{monthTitle}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => addMonths(m, -1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(new Date())}
            >
              امروز
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((day, i) => {
              const isToday = day && isSameDay(day, new Date());
              const dayApps = day
                ? appointments.filter((a) => isSameDay(a.startsAt, day))
                : [];
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "flex min-h-16 flex-col items-center gap-1 rounded-lg border p-1 text-sm transition-colors",
                    day
                      ? "hover:bg-accent"
                      : "border-transparent bg-muted/30",
                    isToday && "border-primary text-primary"
                  )}
                >
                  <span className="mt-0.5 font-medium">
                    {day ? format(day, "d") : ""}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {dayApps.slice(0, 2).map((a) => (
                      <span
                        key={a.id}
                        className={cn("size-1.5 rounded-full", typeColors[a.type])}
                        title={a.title}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">قرارهای امروز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">قرار امروزی ندارید</p>
            ) : (
              todayAppointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(a.startsAt, "HH:mm")} — {typeLabels[a.type]}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={async () => {
                      await deleteAppointmentAction(a.id);
                      window.location.reload();
                    }}
                  >
                    <Plus className="size-4 rotate-45" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">وظایف باز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="تسک جدید…"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <Button onClick={addTask} size="icon">
                <Plus className="size-4" />
              </Button>
            </div>
            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                تسک باز ندارید
              </p>
            ) : (
              openTasks.slice(0, 8).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleTask(t)}
                  />
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.dueAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(t.dueAt)}
                    </span>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedDay)} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>قرار جدید</DialogTitle>
            <DialogDescription>
              {selectedDay ? formatDate(selectedDay) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>عنوان</Label>
              <Input
                autoFocus
                placeholder="مثلاً جلسه قرارداد"
                value={appointmentForm.title}
                onChange={(e) =>
                  setAppointmentForm({ ...appointmentForm, title: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>مشتری</Label>
              <Select
                value={appointmentForm.contactId || undefined}
                onValueChange={(v) =>
                  setAppointmentForm({ ...appointmentForm, contactId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون مشتری" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>نوع</Label>
                <Select
                  value={appointmentForm.type}
                  onValueChange={(v) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      type: v as Appointment["type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(typeLabels) as Appointment["type"][]).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {typeLabels[t]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>ساعت</Label>
                <Input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, time: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveAppointment} disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت قرار"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
