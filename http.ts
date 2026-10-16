import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return "local";
}

export function enforceRateLimit(request: NextRequest, routeName: string, max = 40, windowMs = 60_000) {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${routeName}:${ip}`, max, windowMs);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Zu viele Anfragen. Bitte kurz warten und erneut versuchen.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }
  return null;
}

export function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
