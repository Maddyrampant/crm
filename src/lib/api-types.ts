export type ContactSource =
  | "website"
  | "referral"
  | "social"
  | "cold_call"
  | "advertisement"
  | "other";

export type LifecycleStage = "lead" | "prospect" | "customer" | "inactive";

export type DealStatus = "open" | "won" | "lost";

export type TagRow = {
  id: string;
  name: string;
  color: string;
};

export type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  companyName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  source: ContactSource;
  lifecycleStage: LifecycleStage;
  customFields: Record<string, unknown>;
  tags: TagRow[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomFieldRow = {
  id: string;
  name: string;
  key: string;
  type: "text" | "number" | "date" | "select";
  options: string[];
};

export type ActivityRow = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
};

export type DealRow = {
  id: string;
  title: string;
  amount: number;
  pipelineId: string;
  stageId: string;
  stageName: string | null;
  stageColor: string | null;
  contactId: string | null;
  contactName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
  companyName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  closeDate: string | null;
  status: DealStatus;
  wonAt: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PipelineRow = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: StageRow[];
};

export type StageRow = {
  id: string;
  name: string;
  color: string;
  orderIndex: string;
  winProbability: string;
};

export type KanbanStageRow = StageRow & {
  deals: DealRow[];
};

export type KanbanBoardRow = {
  pipeline: { id: string; name: string; isDefault: boolean } | null;
  stages: KanbanStageRow[];
};

export type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  total: string;
  contactId: string;
};

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  unitPrice: string;
  active: boolean;
};
