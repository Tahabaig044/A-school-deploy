import { createHmac, createHash } from "crypto"

/**
 * QR tokens are opaque, deterministic HMAC derivations of the card id.
 * - The raw token is never stored; only its SHA-256 hash is persisted in `id_cards.qr_token_hash`.
 * - Because the derivation is deterministic, the same card always renders the same QR.
 * - Verification looks the token up by its hash (indexed, unique).
 *
 * ID_CARD_TOKEN_SECRET is mandatory in production; there is no silent fallback
 * (a hardcoded dev secret would allow forging tokens for known card ids).
 */
function getTokenSecret(): string {
  const secret = process.env.ID_CARD_TOKEN_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ID_CARD_TOKEN_SECRET is required in production. Set it to a long random value and keep it secret.",
      )
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY || "id-card-dev-secret-change-me"
  }
  return secret
}

export function deriveQrToken(cardId: string): string {
  return createHmac("sha256", getTokenSecret()).update(`id-card:${cardId}`).digest("base64url")
}

export function hashQrToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function verifyTokenMatchesHash(token: string, hash: string): boolean {
  const computed = hashQrToken(token)
  return computed.length === hash.length && computed === hash
}
