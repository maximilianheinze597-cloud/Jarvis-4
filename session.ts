import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { getServerEnv } from "@/lib/env";

const COOKIE_NAME = "jarvis_sid";

function signSessionId(raw: string) {
  const { JARVIS_SESSION_SECRET } = getServerEnv();
  const digest = createHash("sha256").update(`${raw}.${JARVIS_SESSION_SECRET}`).digest("hex");
  return `${raw}.${digest.slice(0, 16)}`;
}

function verifySessionId(value: string) {
  const [raw, sig] = value.split(".");
  if (!raw || !sig) return null;
  const expected = signSessionId(raw).split(".")[1];
  if (sig !== expected) return null;
  return raw;
}

export async function getOrCreateSessionId() {
  const store = await cookies();
  const current = store.get(COOKIE_NAME)?.value;

  if (current) {
    const verified = verifySessionId(current);
    if (verified) return verified;
  }

  const raw = randomUUID().replace(/-/g, "").slice(0, 32);
  const signed = signSessionId(raw);

  store.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return raw;
}
