import { createHash, randomBytes } from "crypto"

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Hash a token using SHA-256
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  return tokenHash === hash
}
