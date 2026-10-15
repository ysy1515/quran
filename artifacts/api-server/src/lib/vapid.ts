import { createHash } from "node:crypto";

// SHA-256 fingerprints of the VAPID key pair that was committed to the public
// repository (public key, private key). The keys themselves are not stored here.
// If either is configured, push stays disabled until the keys are rotated.
const LEAKED_VAPID_FINGERPRINTS = new Set([
  "9e9a906b6aab2c27c603634b3881e71a58ec36e3aaf7af3262dc80aaabc27a42",
  "df33e7f203edc67b3cd21509e309d69ef1625074c714e6b81b10f69559dae291",
]);

export function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export type VapidStatus =
  | { ok: true; publicKey: string; privateKey: string; subject: string; publicKeyFingerprint: string }
  | { ok: false; reason: "missing" | "leaked-key" };

/** Reads VAPID settings from the environment. Never logs or returns the private key in a reason. */
export function readVapidConfig(env: NodeJS.ProcessEnv = process.env): VapidStatus {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return { ok: false, reason: "missing" };
  if (LEAKED_VAPID_FINGERPRINTS.has(fingerprint(publicKey)) || LEAKED_VAPID_FINGERPRINTS.has(fingerprint(privateKey))) {
    return { ok: false, reason: "leaked-key" };
  }
  return {
    ok: true,
    publicKey,
    privateKey,
    subject: env.VAPID_SUBJECT?.trim() || "mailto:quran@app.com",
    publicKeyFingerprint: fingerprint(publicKey).slice(0, 16),
  };
}
