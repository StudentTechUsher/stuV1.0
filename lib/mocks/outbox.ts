/**
 * Assumptions:
 * - In-memory storage for PoC (resets on server restart)
 * - Stores latest digest per advisor
 */

import type { AdvisorDigest } from '@/lib/jobs/withdrawalDigest';

const outbox: Map<string, AdvisorDigest[]> = new Map();

export function storeDigest(advisorId: string, digest: AdvisorDigest): void {
  const existing = outbox.get(advisorId) || [];
  existing.push(digest);
  // Keep only last 10 digests per advisor
  if (existing.length > 10) {
    existing.shift();
  }
  outbox.set(advisorId, existing);
}

export function getDigests(advisorId: string): AdvisorDigest[] {
  return outbox.get(advisorId) || [];
}

export function clearOutbox(): void {
  outbox.clear();
}
