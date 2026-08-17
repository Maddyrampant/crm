"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  CheckCircle2,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getKanbanBoardAction, moveDealAction, setDealOutcomeAction, deleteDealAction } from "@/actions/deals";
import { DealFormDialog } from "@/components/pipeline/deal-form-dialog";
import { NewPipelineDialog, NewStageDialog } from "@/components/pipeline/pipeline-dialogs";
import { STATUS_LABELS } from "@/lib/labels";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { DealRow, KanbanBoardRow, KanbanStageRow, PipelineRow } from "@/lib/api-types";

type Props = {
  initialBoard: KanbanBoardRow;
  initialPipelines: PipelineRow[];
  contacts: { id: string; name: string }[];
  members: { id: string; name: string; email: string }[];
  canManageDeal: boolean;
  canManagePipeline: boolean;
};

const DealCard = memo(function DealCard({
  deal,
  onOpen,
  onWon,
  onLost,
  onDelete,
  canManage,
}: {
  deal: DealRow;
  onOpen: () => void;
  onWon: () => void;
  onLost: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const isClosed = deal.status !== "open";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-40" : ""
      } ${isClosed ? "opacity-70" : ""} cursor-grab active:cursor-grabbing touch-none`}
    >
      <div className="flex items-start gap-2">
        {canManage && (
          <span className="mt-0.5 text-muted-foreground/50" {...attributes} {...listeners}>
            <GripVertical className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="w-full text-start"
          >
            <p className="truncate text-sm font-medium">{deal.title}</p>
          </button>

          {(deal.contactName || deal.companyName) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[deal.contactName ? `${deal.contactName} ${deal.contactLastName ?? ""}` : null, deal.companyName]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{formatCurrency(deal.amount)}</span>
            {isClosed ? (
              <Badge variant={deal.status === "won" ? "default" : "destructive"}>
                {STATUS_LABELS[deal.status]}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                {deal.ownerName || "بدون مسئول"}
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onOpen}>
                <Pencil className="size-4" />
                ویرایش
              </DropdownMenuItem>
              {!isClosed && (
                <>
                  <DropdownMenuItem onClick={onWon}>
                    <CheckCircle2 className="size-4 text-success" />
                    برنده شد
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLost}>
                    <XCircle className="size-4 text-destructive" />
                    باخته شد
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
});

const StageColumn = memo(function StageColumn({
  stage,
  onNewDeal,
  onOpenDeal,
  onWon,
  onLost,
  onDeleteDeal,
  canManage,
}: {
  stage: KanbanStageRow;
  onNewDeal: () => void;
  onOpenDeal: (deal: DealRow) => void;
  onWon: (deal: DealRow) => void;
  onLost: (deal: DealRow) => void;
  onDeleteDeal: (deal: DealRow) => void;
  canManage: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const total = stage.deals.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[260px] max-w-[340px] flex-1 flex-col rounded-xl border bg-muted/40 transition-colors ${
        isOver ? "border-primary ring-2 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span className="truncate text-sm font-semibold">{stage.name}</span>
          <Badge variant="secondary" className="shrink-0">{formatNumber(stage.deals.length)}</Badge>
        </div>
        {canManage && (
          <Button variant="ghost" size="icon-xs" onClick={onNewDeal} className="shrink-0">
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {stage.deals.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            فروشی در این مرحله نیست
          </p>
        )}
        {stage.deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onOpen={() => onOpenDeal(deal)}
            onWon={() => onWon(deal)}
            onLost={() => onLost(deal)}
            onDelete={() => onDeleteDeal(deal)}
            canManage={canManage}
          />
        ))}
      </div>

      {Number(stage.winProbability) > 0 && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          احتمال: {formatNumber(stage.winProbability)}٪
        </div>
      )}
      {total > 0 && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          مجموع: {formatCurrency(total)}
        </div>
      )}
    </div>
  );
});

export function KanbanBoard({
  initialBoard,
  initialPipelines,
  contacts,
  members,
  canManageDeal,
  canManagePipeline,
}: Props) {
  const [board, setBoard] = useState(initialBoard);
  const [pipelines] = useState(initialPipelines);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(
    initialBoard.pipeline?.id ?? ""
  );

  const [activeDeal, setActiveDeal] = useState<DealRow | null>(null);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealRow | null>(null);
  const [newStageOpen, setNewStageOpen] = useState(false);
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState<DealRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDealStageId, setNewDealStageId] = useState<string | undefined>(undefined);

  const [lostDeal, setLostDeal] = useState<DealRow | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [losing, setLosing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const dealById = useMemo(() => {
    const map = new Map<string, DealRow>();
    for (const s of board.stages) {
      for (const d of s.deals) map.set(d.id, d);
    }
    return map;
  }, [board]);

  async function reloadBoard() {
    const result = await getKanbanBoardAction(selectedPipelineId || null);
    if (result.ok && result.data) {
      setBoard(result.data);
      setSelectedPipelineId(result.data.pipeline?.id ?? "");
    }
    return result;
  }

  function handleDragStart(event: DragStartEvent) {
    const deal = dealById.get(String(event.active.id));
    if (deal) setActiveDeal(deal);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const deal = dealById.get(String(event.active.id));
    setActiveDeal(null);
    if (!deal) return;

    let targetStageId = String(event.over?.id ?? deal.stageId);
    if (dealById.has(targetStageId)) {
      targetStageId = dealById.get(targetStageId)!.stageId;
    }
    if (targetStageId === deal.stageId) return;

    setBoard((b) => ({
      ...b,
      stages: b.stages.map((s) => ({
        ...s,
        deals:
          s.id === deal.stageId
            ? s.deals.filter((d) => d.id !== deal.id)
            : s.id === targetStageId
              ? [{ ...deal, stageId: targetStageId }, ...s.deals]
              : s.deals,
      })),
    }));

    const result = await moveDealAction(deal.id, targetStageId);
    if (!result.ok) {
      toast.error(result.error);
      reloadBoard();
    }
  }

  function openNewDeal(stageId?: string) {
    setEditingDeal(null);
    setNewDealStageId(stageId);
    setDealFormOpen(true);
  }

  function handleDealSaved(saved: DealRow) {
    const pipeline = pipelines.find((p) => p.id === saved.pipelineId);
    const stageExists = pipeline?.stages.some((s) => s.id === saved.stageId);
    if (stageExists) reloadBoard();
  }

  async function handleWon(deal: DealRow) {
    const result = await setDealOutcomeAction(deal.id, "won");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("فروش به عنوان برنده ثبت شد");
    reloadBoard();
  }

  function handleLost(deal: DealRow) {
    setLostDeal(deal);
    setLostReason("");
  }

  async function confirmLost() {
    if (!lostDeal) return;
    setLosing(true);
    const result = await setDealOutcomeAction(lostDeal.id, "lost", lostReason || null);
    setLosing(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("فروش به عنوان باخته ثبت شد");
    setLostDeal(null);
    setLostReason("");
    reloadBoard();
  }

  async function handleDeleteDeal() {
    if (!deletingDeal) return;
    setBusy(true);
    const result = await deleteDealAction(deletingDeal.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("فروش حذف شد");
    setDeletingDeal(null);
    reloadBoard();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={selectedPipelineId}
            onValueChange={async (v) => {
              abortRef.current?.abort();
              const controller = new AbortController();
              abortRef.current = controller;
              setSelectedPipelineId(v);
              const result = await getKanbanBoardAction(v);
              if (!controller.signal.aborted && result.ok && result.data) setBoard(result.data);
            }}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="انتخاب فانل" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManagePipeline && (
            <Button variant="outline" size="sm" onClick={() => setNewPipelineOpen(true)}>
              <Plus className="size-4" />
              فانل جدید
            </Button>
          )}
        </div>

        {canManageDeal && (
          <Button size="sm" onClick={() => openNewDeal()}>
            <Plus className="size-4" />
            فروش جدید
          </Button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
        {board.stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            onNewDeal={() => openNewDeal(stage.id)}
            onOpenDeal={(deal) => {
              setEditingDeal(deal);
              setDealFormOpen(true);
            }}
            onWon={handleWon}
            onLost={handleLost}
            onDeleteDeal={(deal) => setDeletingDeal(deal)}
            canManage={canManageDeal}
          />
        ))}
        {canManagePipeline && selectedPipelineId && (
          <button
            type="button"
            onClick={() => setNewStageOpen(true)}
            className="flex h-16 min-w-[260px] max-w-[340px] flex-1 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" />
            افزودن مرحله
          </button>
        )}
      </div>

      {!board.pipeline && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {pipelines.length === 0
            ? "هنوز فانل فروشی ساخته نشده است."
            : "فانلی انتخاب نشده است."}
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDeal(null)}
      >
        <DragOverlay>
          {activeDeal ? (
            <div className="min-w-[260px] max-w-[340px] cursor-grabbing">
              <Card className="p-3 shadow-lg">
                <p className="text-sm font-medium">{activeDeal.title}</p>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(activeDeal.amount)}</p>
              </Card>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealFormDialog
        open={dealFormOpen}
        onOpenChange={setDealFormOpen}
        pipelines={pipelines}
        contacts={contacts}
        members={members}
        deal={editingDeal}
        defaultPipelineId={selectedPipelineId}
        defaultStageId={editingDeal?.stageId ?? newDealStageId ?? board.stages[0]?.id}
        onSaved={handleDealSaved}
      />

      <NewPipelineDialog
        open={newPipelineOpen}
        onOpenChange={setNewPipelineOpen}
        onCreated={async () => {
          const result = await reloadBoard();
          if (result.ok) {
            const list = await getKanbanBoardAction();
            if (list.ok && list.data) setSelectedPipelineId(list.data.pipeline?.id ?? "");
          }
        }}
      />

      {selectedPipelineId && (
        <NewStageDialog
          open={newStageOpen}
          onOpenChange={setNewStageOpen}
          pipelineId={selectedPipelineId}
          onCreated={() => reloadBoard()}
        />
      )}

      {/* حذف فروش */}
      <Dialog open={!!deletingDeal} onOpenChange={(o) => !o && setDeletingDeal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف فروش</DialogTitle>
            <DialogDescription>
              مطمئن هستید که «{deletingDeal?.title}» حذف شود؟ این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDeal(null)} disabled={busy}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={handleDeleteDeal} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* دلیل باخت */}
      <Dialog open={!!lostDeal} onOpenChange={(o) => { if (!o) { setLostDeal(null); setLostReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ثبت باخت فروش</DialogTitle>
            <DialogDescription>
              آیا مطمئنید که «{lostDeal?.title}» باخته شود؟
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="lostReason" className="text-sm font-medium">
              دلیل باخت <span className="text-muted-foreground">(اختیاری)</span>
            </label>
            <Textarea
              id="lostReason"
              placeholder="مثلاً: قیمت رقیب پایین‌تر بود..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLostDeal(null); setLostReason(""); }} disabled={losing}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={confirmLost} disabled={losing}>
              {losing && <Loader2 className="size-4 animate-spin" />}
              ثبت باخت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
