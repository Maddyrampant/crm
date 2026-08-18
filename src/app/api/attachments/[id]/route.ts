import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/session";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireWorkspace();
    const [att] = await db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.id, id),
          eq(attachments.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!att) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
    const filePath = join(process.cwd(), "public", att.storagePath);
    const data = await readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": att.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(att.filename)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
