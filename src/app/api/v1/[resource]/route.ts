import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, invoices, type Contact } from "@/db/schema";
import { verifyApiKey } from "@/services/automation";

function unauthorized() {
  return Response.json({ error: "Invalid API key" }, { status: 401 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const auth = _req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const workspaceId = await verifyApiKey(token);
  if (!workspaceId) return unauthorized();

  const limit = Math.min(Number(_req.nextUrl.searchParams.get("limit") ?? 50), 200);

  if (resource === "contacts") {
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId))
      .limit(limit);
    return Response.json({ ok: true, data: rows });
  }

  if (resource === "invoices") {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId))
      .limit(limit);
    return Response.json({ ok: true, data: rows });
  }

  return Response.json({ error: "Resource not found" }, { status: 404 });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const auth = _req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const workspaceId = await verifyApiKey(token);
  if (!workspaceId) return unauthorized();

  if (resource === "contacts") {
    const body = (await _req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body?.firstName) {
      return Response.json({ error: "firstName is required" }, { status: 422 });
    }
    const [row] = await db
      .insert(contacts)
      .values({
        workspaceId,
        firstName: String(body.firstName),
        lastName: body.lastName ? String(body.lastName) : null,
        email: body.email ? String(body.email) : null,
        phone: body.phone ? String(body.phone) : null,
        notes: body.notes ? String(body.notes) : null,
        source: (body.source as Contact["source"]) || "other",
      })
      .returning();
    return Response.json({ ok: true, data: row }, { status: 201 });
  }

  return Response.json({ error: "Resource not found" }, { status: 404 });
}
