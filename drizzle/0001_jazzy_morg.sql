CREATE TYPE "public"."sequence_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."sequence_step_status" AS ENUM('pending', 'sent', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."recurrence_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."call_outcome" AS ENUM('connected', 'no_answer', 'voicemail', 'busy', 'wrong_number');--> statement-breakpoint
CREATE TYPE "public"."survey_status" AS ENUM('pending', 'sent', 'completed');--> statement-breakpoint
CREATE TYPE "public"."survey_type" AS ENUM('csat', 'nps', 'ces');--> statement-breakpoint
CREATE TYPE "public"."sla_status" AS ENUM('active', 'breached', 'met');--> statement-breakpoint
CREATE TYPE "public"."chat_message_role" AS ENUM('visitor', 'agent');--> statement-breakpoint
CREATE TYPE "public"."messenger_channel" AS ENUM('whatsapp', 'telegram', 'instagram', 'other');--> statement-breakpoint
CREATE TYPE "public"."messenger_integration_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "email_sequence_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"status" "sequence_step_status" DEFAULT 'pending' NOT NULL,
	"next_send_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequence_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence_id" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"delay_days" integer DEFAULT 1 NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "sequence_status" DEFAULT 'draft' NOT NULL,
	"total_enrolled" integer DEFAULT 0 NOT NULL,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"frequency" "recurrence_frequency" DEFAULT 'monthly' NOT NULL,
	"status" "recurrence_status" DEFAULT 'active' NOT NULL,
	"template_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discount" jsonb,
	"tax_rate" jsonb,
	"notes" text,
	"next_generation_at" timestamp with time zone,
	"last_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"contact_id" text,
	"user_id" text,
	"direction" text DEFAULT 'outbound' NOT NULL,
	"duration" integer,
	"outcome" "call_outcome" DEFAULT 'connected' NOT NULL,
	"notes" text,
	"phone" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"deal_id" text NOT NULL,
	"playbook_id" text,
	"step_title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_playbook" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_products" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"deal_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" numeric(18, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(18, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "territories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csat_surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"deal_id" text,
	"type" "survey_type" DEFAULT 'csat' NOT NULL,
	"status" "survey_status" DEFAULT 'pending' NOT NULL,
	"score" integer,
	"comment" text,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"policy_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" "sla_status" DEFAULT 'active' NOT NULL,
	"response_deadline" timestamp with time zone,
	"resolution_deadline" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"entity_type" text DEFAULT 'deal' NOT NULL,
	"response_time_hours" integer DEFAULT 24 NOT NULL,
	"resolution_time_hours" integer DEFAULT 72 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"user_id" text,
	"transcription" text,
	"audio_url" text,
	"duration" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" "chat_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"contact_id" text,
	"visitor_name" text,
	"visitor_email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_to" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messenger_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"channel" "messenger_channel" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "messenger_integration_status" DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messenger_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"integration_id" text NOT NULL,
	"external_id" text,
	"direction" text DEFAULT 'inbound' NOT NULL,
	"content" text NOT NULL,
	"contact_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequence_enrollments" ADD CONSTRAINT "email_sequence_enrollments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_checklists" ADD CONSTRAINT "deal_checklists_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_checklists" ADD CONSTRAINT "deal_checklists_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_checklists" ADD CONSTRAINT "deal_checklists_playbook_id_sales_playbook_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."sales_playbook"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_playbook" ADD CONSTRAINT "sales_playbook_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_products" ADD CONSTRAINT "deal_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "territories" ADD CONSTRAINT "territories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_surveys" ADD CONSTRAINT "csat_surveys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_surveys" ADD CONSTRAINT "csat_surveys_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_instances" ADD CONSTRAINT "sla_instances_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_instances" ADD CONSTRAINT "sla_instances_policy_id_sla_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_chat_messages" ADD CONSTRAINT "live_chat_messages_session_id_live_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_chat_sessions" ADD CONSTRAINT "live_chat_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_chat_sessions" ADD CONSTRAINT "live_chat_sessions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_integrations" ADD CONSTRAINT "messenger_integrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_messages" ADD CONSTRAINT "messenger_messages_integration_id_messenger_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."messenger_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_seq_enrollments_seq_contact_uq" ON "email_sequence_enrollments" USING btree ("sequence_id","contact_id");--> statement-breakpoint
CREATE INDEX "email_seq_enrollments_sequence_idx" ON "email_sequence_enrollments" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "email_seq_enrollments_contact_idx" ON "email_sequence_enrollments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "email_sequence_steps_sequence_idx" ON "email_sequence_steps" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "email_sequences_workspace_idx" ON "email_sequences" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "recurring_invoices_workspace_idx" ON "recurring_invoices" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "recurring_invoices_contact_idx" ON "recurring_invoices" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "call_logs_workspace_idx" ON "call_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "call_logs_contact_idx" ON "call_logs" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "call_logs_user_idx" ON "call_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deal_checklists_workspace_idx" ON "deal_checklists" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "deal_checklists_deal_idx" ON "deal_checklists" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_checklists_playbook_idx" ON "deal_checklists" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "sales_playbook_workspace_idx" ON "sales_playbook" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "deal_products_workspace_idx" ON "deal_products" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "deal_products_deal_idx" ON "deal_products" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_products_product_idx" ON "deal_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "territories_workspace_idx" ON "territories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "territories_owner_idx" ON "territories" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "csat_surveys_workspace_idx" ON "csat_surveys" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "csat_surveys_contact_idx" ON "csat_surveys" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "csat_surveys_deal_idx" ON "csat_surveys" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "sla_instances_workspace_idx" ON "sla_instances" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sla_instances_policy_idx" ON "sla_instances" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "sla_instances_entity_idx" ON "sla_instances" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "sla_policies_workspace_idx" ON "sla_policies" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "voice_notes_workspace_idx" ON "voice_notes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "voice_notes_user_idx" ON "voice_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "voice_notes_entity_idx" ON "voice_notes" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "live_chat_messages_session_idx" ON "live_chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "live_chat_sessions_workspace_idx" ON "live_chat_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "live_chat_sessions_status_idx" ON "live_chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "live_chat_sessions_contact_idx" ON "live_chat_sessions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "messenger_integrations_workspace_idx" ON "messenger_integrations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "messenger_messages_integration_idx" ON "messenger_messages" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "messenger_messages_contact_idx" ON "messenger_messages" USING btree ("contact_id");