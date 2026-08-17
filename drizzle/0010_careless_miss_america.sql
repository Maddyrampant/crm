ALTER TABLE "campaign_email_templates" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "email_campaigns" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "contact_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "custom_field_defs" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "custom_field_vals" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sms_campaigns" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sales_goals" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sales_goals" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "workspace_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" SET DATA TYPE text;