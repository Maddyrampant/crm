import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/session";
import { listApiKeys, listEmailLogs, listSmsLogs, listWebhooks } from "@/services/automation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { LogsPanel } from "@/components/settings/logs-panel";
import { WebhooksPanel } from "@/components/settings/webhooks-panel";

export const metadata: Metadata = { title: "تنظیمات" };

export default async function SettingsPage() {
  const { workspaceId } = await requireWorkspace();
  const [webhooks, apiKeys, emails, sms] = await Promise.all([
    listWebhooks(workspaceId),
    listApiKeys(workspaceId),
    listEmailLogs(workspaceId, 20),
    listSmsLogs(workspaceId, 20),
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
          <TabsTrigger value="apikeys">کلیدهای API</TabsTrigger>
          <TabsTrigger value="integrations">اتصال‌ها</TabsTrigger>
          <TabsTrigger value="logs">لاگ‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="webhooks">
          <WebhooksPanel webhooks={webhooks} />
        </TabsContent>
        <TabsContent value="apikeys">
          <ApiKeysPanel keys={apiKeys} />
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
