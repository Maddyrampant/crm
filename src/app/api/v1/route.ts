import { NextRequest } from "next/server";
import { verifyApiKey } from "@/services/automation";

function unauthorized() {
  return Response.json({ error: "Invalid API key" }, { status: 401 });
}

export async function GET(_req: NextRequest) {
  const auth = _req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const workspaceId = await verifyApiKey(token);
  if (!workspaceId) return unauthorized();

  return Response.json({
    ok: true,
    workspace: workspaceId,
    baseUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/v1`,
    endpoints: [
      "/contacts",
      "/companies",
      "/deals",
      "/invoices",
      "/invoices/:id/payments",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    auth: "Authorization: Bearer crm_...",
    rateLimit: "60 requests/min per workspace",
  });
}
