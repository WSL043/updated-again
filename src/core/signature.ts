import { ed25519 } from "@noble/curves/ed25519.js";
import { canonicalize, toUnsignedCapsule } from "./canonical";
import type { UpdateCapsule } from "./types";

const encoder = new TextEncoder();

function fromBase64(value: string): Uint8Array {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

export async function verifyCapsule(capsule: UpdateCapsule, publicKeyBase64: string): Promise<boolean> {
  if (!capsule.integrity.signature || !publicKeyBase64) return false;

  const payloadHash = await sha256(canonicalize({ kind: capsule.kind, payload: capsule.payload }));
  if (payloadHash !== capsule.integrity.payloadSha256) return false;

  return ed25519.verify(
    fromBase64(capsule.integrity.signature),
    encoder.encode(canonicalize(toUnsignedCapsule(capsule))),
    fromBase64(publicKeyBase64),
  );
}
