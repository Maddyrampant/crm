import { requireWorkspace } from "@/lib/session";
import { generateInvoicePdf } from "@/services/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { workspaceId } = await requireWorkspace();
  const { id } = await params;

  try {
    const bytes = await generateInvoicePdf(workspaceId, id);
    return new Response(
      new Blob([Buffer.from(bytes)], { type: "application/pdf" }),
      {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "فاکتور یافت نشد", detail: err instanceof Error ? err.message : String(err) },
      { status: 404 }
    );
  }
}
