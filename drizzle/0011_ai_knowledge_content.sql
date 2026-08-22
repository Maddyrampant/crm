CREATE TYPE "public"."knowledge_category" AS ENUM('sales_advice', 'product_info', 'support_faq', 'objection_handling', 'follow_up', 'custom');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('assigned', 'viewed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('video_link', 'document', 'image', 'custom');--> statement-breakpoint
CREATE TABLE "woo_stores" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"consumer_key" text NOT NULL,
	"consumer_secret" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "woo_stores_workspace_url_idx" UNIQUE("workspace_id","url")
);
--> statement-breakpoint
CREATE TABLE "woo_sync_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"topic" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"action" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"error" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_knowledge" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"category" "knowledge_category" DEFAULT 'custom' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_content" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"type" "content_type" DEFAULT 'video_link' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_content_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"content_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"assigned_by" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"viewed_at" timestamp with time zone,
	"notes" text,
	"status" "content_status" DEFAULT 'assigned' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "woo_stores" ADD CONSTRAINT "woo_stores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woo_sync_logs" ADD CONSTRAINT "woo_sync_logs_store_id_woo_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."woo_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woo_sync_logs" ADD CONSTRAINT "woo_sync_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_knowledge" ADD CONSTRAINT "ai_knowledge_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content" ADD CONSTRAINT "ai_content_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_assignments" ADD CONSTRAINT "ai_content_assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_assignments" ADD CONSTRAINT "ai_content_assignments_content_id_ai_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."ai_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_assignments" ADD CONSTRAINT "ai_content_assignments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_assignments" ADD CONSTRAINT "ai_content_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "woo_stores_workspace_idx" ON "woo_stores" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "woo_sync_logs_store_idx" ON "woo_sync_logs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "woo_sync_logs_workspace_idx" ON "woo_sync_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "woo_sync_logs_created_idx" ON "woo_sync_logs" USING btree ("created_at");