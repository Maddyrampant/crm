import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasPermission, requireWorkspace } from "@/lib/session";
import {
  listApiKeys,
  listDeliveries,
  listEmailLogs,
  listEmailTemplates,
  listSmsLogs,
  listWebhooks,
  processDueDeliveries,
} from "@/services/automation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { DeliveriesPanel } from "@/components/settings/deliveries-panel";
import { EmailTemplatesPanel } from "@/components/settings/email-templates-panel";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { LogsPanel } from "@/components/settings/logs-panel";
import { WebhooksPanel } from "@/components/settings/webhooks-panel";

export const metadata: Metadata = { title: "تنظیمات" };

export default async function SettingsPage() {
  const { workspaceId, membership } = await requireWorkspace();
  if (!hasPermission(membership, "manager")) {
    redirect("/dashboard");
  }
  await processDueDeliveries(workspaceId);
  const [webhooks, apiKeys, emails, sms, deliveries, templates] = await Promise.all([
    listWebhooks(workspaceId),
    listApiKeys(workspaceId),
    listEmailLogs(workspaceId, 20),
    listSmsLogs(workspaceId, 20),
    listDeliveries(workspaceId, 25),
    listEmailTemplates(workspaceId),
  ]);

  const integrations = {
    email: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
    resend: Boolean(process.env.RESEND_API_KEY),
    smtp: Boolean(process.env.SMTP_HOST),
    kavenegar: Boolean(process.env.KAVENEGAR_API_KEY),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنظیمات</h1>
        <p className="text-muted-foreground">
          وب‌هاوک‌ها، کلیدهای API و اتصال‌های ایمیل و پیامک
        </p>
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">وب‌هاوک</TabsTrigger>
          <TabsTrigger value="deliveries">تحویل‌ها</TabsTrigger>
          <TabsTrigger value="apikeys">کلیدهای API</TabsTrigger>
          <TabsTrigger value="templates">الگوهای ایمیل</TabsTrigger>
          <TabsTrigger value="integrations">اتصال‌ها</TabsTrigger>
          <TabsTrigger value="logs">لاگ‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="webhooks">
          <WebhooksPanel webhooks={webhooks} />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesPanel deliveries={deliveries} />
        </TabsContent>
        <TabsContent value="apikeys">
          <ApiKeysPanel keys={apiKeys} />
        </TabsContent>
        <TabsContent value="templates">
          <EmailTemplatesPanel templates={templates} />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsPanel integrations={integrations} />
        </TabsContent>
        <TabsContent value="logs">
          <LogsPanel emails={emails} sms={sms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
