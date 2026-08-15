import "server-only";

import type { ActivityLog, Company, Contact, CustomField, Deal, Tag } from "@/db/schema";
import type {
  ActivityRow,
  CompanyRow,
  ContactRow,
  CustomFieldRow,
  DealRow,
  KanbanBoardRow,
  KanbanStageRow,
  PipelineRow,
  StageRow,
} from "@/lib/api-types";

export function serializeDate(d: Date | string | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

export function toContactRow(
  c: Contact & { companyName?: string | null; ownerName?: string | null; tags?: Tag[] }
): ContactRow {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    companyId: c.companyId,
    companyName: c.companyName ?? null,
    ownerId: c.ownerId,
    ownerName: c.ownerName ?? null,
    source: c.source,
    lifecycleStage: c.lifecycleStage,
    customFields: c.customFields,
    tags: (c.tags ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color })),
    notes: c.notes,
    createdAt: serializeDate(c.createdAt)!,
    updatedAt: serializeDate(c.updatedAt)!,
  };
}

export function toCompanyRow(c: Company & { contactCount?: number }): CompanyRow {
  return {
    id: c.id,
    name: c.name,
    domain: c.domain,
    industry: c.industry,
    website: c.website,
    address: c.address,
    notes: c.notes,
    contactCount: c.contactCount ?? 0,
    createdAt: serializeDate(c.createdAt)!,
    updatedAt: serializeDate(c.updatedAt)!,
  };
}

export function toCustomFieldRow(c: CustomField): CustomFieldRow {
  return {
    id: c.id,
    name: c.name,
    key: c.key,
    type: c.type,
    options: c.options,
  };
}

export function toActivityRow(a: ActivityLog): ActivityRow {
  return {
    id: a.id,
    entityType: a.entityType,
    entityId: a.entityId,
    action: a.action,
    userId: a.userId,
    data: a.data,
    createdAt: serializeDate(a.createdAt)!,
  };
}

export function toDealRow(
  d: Deal & {
    stageName?: string | null;
    stageColor?: string | null;
    contactName?: string | null;
    contactLastName?: string | null;
    contactEmail?: string | null;
    companyName?: string | null;
    ownerName?: string | null;
  }
): DealRow {
  return {
    id: d.id,
    title: d.title,
    amount: Number(d.amount),
    pipelineId: d.pipelineId,
    stageId: d.stageId,
    stageName: d.stageName ?? null,
    stageColor: d.stageColor ?? null,
    contactId: d.contactId,
    contactName: d.contactName ?? null,
    contactLastName: d.contactLastName ?? null,
    contactEmail: d.contactEmail ?? null,
    companyName: d.companyName ?? null,
    ownerId: d.ownerId,
    ownerName: d.ownerName ?? null,
    closeDate: serializeDate(d.closeDate),
    status: d.status,
    wonAt: serializeDate(d.wonAt),
    lostReason: d.lostReason,
    createdAt: serializeDate(d.createdAt)!,
    updatedAt: serializeDate(d.updatedAt)!,
  };
}

type KanbanStageInput = {
  id: string;
  name: string;
  color: string;
  orderIndex: string;
  winProbability: string;
  deals: Array<{
    deal: Deal;
    amount: number;
    stageName?: string | null;
    stageColor?: string | null;
    contactName?: string | null;
    contactLastName?: string | null;
    contactEmail?: string | null;
    companyName?: string | null;
    ownerName?: string | null;
  }>;
};

export function toKanbanStageRow(s: KanbanStageInput): KanbanStageRow {
  return {
    id: s.id,
    name: s.name,
    color: s.color,
    orderIndex: s.orderIndex,
    winProbability: s.winProbability,
    deals: s.deals.map((d) =>
      toDealRow({
        ...d.deal,
        stageName: d.stageName,
        stageColor: d.stageColor,
        contactName: d.contactName,
        contactLastName: d.contactLastName,
        contactEmail: d.contactEmail,
        companyName: d.companyName,
        ownerName: d.ownerName,
      })
    ),
  };
}

export function toKanbanBoardRow(board: {
  pipeline: { id: string; name: string; isDefault: boolean } | null;
  stages: KanbanStageInput[];
}): KanbanBoardRow {
  return {
    pipeline: board.pipeline,
    stages: board.stages.map(toKanbanStageRow),
  };
}

export function toStageRow(s: {
  id: string;
  name: string;
  color: string;
  orderIndex: string;
  winProbability: string;
}): StageRow {
  return { ...s };
}

export function toPipelineRow(p: {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Array<{
    id: string;
    name: string;
    color: string;
    orderIndex: string;
    winProbability: string;
  }>;
}): PipelineRow {
  return {
    id: p.id,
    name: p.name,
    isDefault: p.isDefault,
    stages: p.stages.map(toStageRow),
  };
}
