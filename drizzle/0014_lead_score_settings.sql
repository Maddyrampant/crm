CREATE TABLE "lead_score_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"activity_weight" real DEFAULT 1 NOT NULL,
	"deal_weight" real DEFAULT 2 NOT NULL,
	"invoice_weight" real DEFAULT 3 NOT NULL,
	"recency_decay_days" real DEFAULT 90 NOT NULL,
	"max_score" real DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_score_settings_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "lead_score_settings" ADD CONSTRAINT "lead_score_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;