import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDailyMaintenance } from "@/services/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function secretMatches(token: string): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET تنظیم نشده است" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !secretMatches(token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runDailyMaintenance();
  return NextResponse.json({ ok: true, result });
}
