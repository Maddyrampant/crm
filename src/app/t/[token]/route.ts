import { NextRequest } from "next/server";
import { logTrackingHit, pixelResponse } from "@/services/tracking";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;

  logTrackingHit(token, ip).catch(() => {});
  return pixelResponse();
}
