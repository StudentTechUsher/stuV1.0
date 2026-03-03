import { createHash } from 'node:crypto';

const FERPA_FIELD_PATTERNS = [
  /name/i,
  /email/i,
  /phone/i,
  /address/i,
  /ssn/i,
  /dob/i,
  /birth/i,
  /gpa/i,
  /transcript/i,
  /notes?/i,
  /student/i,
];

function isFerpaSensitiveField(fieldName: string): boolean {
  return FERPA_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function redactValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string' && isFerpaSensitiveField(key)) {
    return {
      redacted: true,
      classification: 'ferpa_sensitive',
      hash: fingerprint(value),
      length: value.length,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(key, item));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      output[childKey] = redactValue(childKey, childValue);
    }
    return output;
  }

  return value;
}

export function redactV3TracePayload(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload) return null;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    output[key] = redactValue(key, value);
  }
  return output;
}
