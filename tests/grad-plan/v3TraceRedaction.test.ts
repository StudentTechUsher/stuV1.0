import { describe, expect, it } from 'vitest';
import { redactV3TracePayload } from '@/lib/grad-plan/v3/redaction';

describe('v3 trace redaction', () => {
  it('masks FERPA-sensitive fields with metadata', () => {
    const redacted = redactV3TracePayload({
      studentName: 'Taylor Student',
      transcriptText: 'BIO 101 A',
      nonSensitive: 'ok',
    });

    expect(redacted?.studentName).toMatchObject({
      redacted: true,
      classification: 'ferpa_sensitive',
    });
    expect(redacted?.transcriptText).toMatchObject({
      redacted: true,
      classification: 'ferpa_sensitive',
    });
    expect(redacted?.nonSensitive).toBe('ok');
  });
});
