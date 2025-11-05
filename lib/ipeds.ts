import fs from 'fs';
import path from 'path';

interface IpedsRecord {
  name: string;
  city: string;
  state: string;
}

let ipedsCache: Map<string, IpedsRecord> | null = null;

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function tokenSetSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeForMatch(str1).split(' ').sort();
  const norm2 = normalizeForMatch(str2).split(' ').sort();

  const set1 = new Set(norm1);
  const set2 = new Set(norm2);

  const intersection = norm1.filter(t => set2.has(t)).length;
  const union = set1.size + set2.size - intersection;

  return union === 0 ? 1 : intersection / union;
}

export function loadIpedsCsv(filePathOrPublicUrl?: string): void {
  try {
    const filePath = filePathOrPublicUrl || path.join(process.cwd(), 'public', 'data', 'ipeds_lookup.csv');

    if (!fs.existsSync(filePath)) {
      return;
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim());

    if (lines.length === 0) return;

    ipedsCache = new Map();

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const cityIdx = headers.indexOf('city');
    const stateIdx = headers.indexOf('state');

    if (nameIdx === -1 || cityIdx === -1 || stateIdx === -1) {
      return;
    }

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length > Math.max(nameIdx, cityIdx, stateIdx)) {
        const record: IpedsRecord = {
          name: parts[nameIdx] || '',
          city: parts[cityIdx] || '',
          state: parts[stateIdx] || '',
        };
        if (record.name) {
          const normalized = normalizeForMatch(record.name);
          ipedsCache.set(normalized, record);
        }
      }
    }
  } catch (error) {
    console.error('Error loading IPEDS CSV:', error);
  }
}

export function lookupFromIpeds(name: string): { city: string | null; state: string | null } | null {
  if (!ipedsCache) {
    loadIpedsCsv();
  }

  if (!ipedsCache || ipedsCache.size === 0) {
    return null;
  }

  const normalized = normalizeForMatch(name);

  let bestMatch: IpedsRecord | null = null;
  let bestScore = 0;

  for (const [key, record] of ipedsCache.entries()) {
    const score = tokenSetSimilarity(normalized, key);
    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      bestMatch = record;
    }
  }

  if (bestMatch) {
    return {
      city: bestMatch.city || null,
      state: bestMatch.state || null,
    };
  }

  return null;
}

export async function lookupFromScorecard(name: string, apiKey?: string): Promise<{ city: string | null; state: string | null } | null> {
  if (!apiKey) {
    return null;
  }

  try {
    const query = encodeURIComponent(name);
    const response = await fetch(
      `https://api.data.gov/ed/collegescorecard/v1/schools.json?school.name=${query}&api_key=${apiKey}&_fields=school.name,school.city,school.state`,
      { timeout: 5000 }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{
        'school.name'?: string;
        'school.city'?: string;
        'school.state'?: string;
      }>;
    };

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        city: result['school.city'] || null,
        state: result['school.state'] || null,
      };
    }

    return null;
  } catch (error) {
    console.error('Error calling Scorecard API:', error);
    return null;
  }
}

export async function resolveCityState(name: string, scorecardKey?: string): Promise<{ city: string | null; state: string | null } | null> {
  const ipedsResult = lookupFromIpeds(name);
  if (ipedsResult && (ipedsResult.city || ipedsResult.state)) {
    return ipedsResult;
  }

  const scorecardResult = await lookupFromScorecard(name, scorecardKey);
  if (scorecardResult && (scorecardResult.city || scorecardResult.state)) {
    return scorecardResult;
  }

  return null;
}
