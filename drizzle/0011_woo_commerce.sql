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
ALTER TABLE "woo_stores" ADD CONSTRAINT "woo_stores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woo_sync_logs" ADD CONSTRAINT "woo_sync_logs_store_id_woo_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."woo_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "woo_sync_logs" ADD CONSTRAINT "woo_sync_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "woo_stores_workspace_idx" ON "woo_stores" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "woo_sync_logs_store_idx" ON "woo_sync_logs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "woo_sync_logs_workspace_idx" ON "woo_sync_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "woo_sync_logs_created_idx" ON "woo_sync_logs" USING btree ("created_at");