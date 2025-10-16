const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  '$': 's',
  '!': 'i'
};

const BANNED_WORDS = [
  'fuck',
  'fucks',
  'fucker',
  'fuckers',
  'fucking',
  'motherfucker',
  'fack', // leet speak variant of fuck (f@ck)
  'fuc', // partial obfuscation
  'fuk', // common misspelling
  'shit',
  'shits',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'bastard',
  'bastards',
  'asshole',
  'assholes',
  'cunt',
  'cunts',
  'dick',
  'dicks',
  'dickhead',
  'dickheads',
  'pussy',
  'pussies',
  'slut',
  'sluts',
  'whore',
  'whores',
  'porn',
  'porno',
  'pornography',
  'pornographic',
  'sex',
  'sexual',
  'sexy',
  'orgasm',
  'jerkoff',
  'handjob',
  'blowjob',
  'rimjob',
  'buttfuck',
  'cum',
  'ejaculate',
  'sperm',
  'scrotum',
  'ballsack',
  'ballbag',
  'penis',
  'vagina',
  'boob',
  'boobs',
  'tits',
  'tit',
  'milf',
  'rape',
  'rapist',
  'nigger',
  'nigga',
  'fag',
  'faggot'
] as const;

const normalizeLeetSpeak = (value: string) =>
  value
    .toLowerCase()
    .split('')
    .map((char) => LEET_MAP[char] ?? char)
    .join('');

const sanitizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

export const findProhibitedSubstring = (value: string): string | null => {
  if (!value) return null;

  // Normalize: lowercase, replace whitespace, convert leet speak
  const normalized = normalizeLeetSpeak(sanitizeWhitespace(value).toLowerCase());

  // Remove ALL non-alphanumeric characters to catch obfuscated variants
  // e.g., "f.u.c.k" or "f@ck" becomes "fuck"
  const cleaned = normalized.replace(/[^a-z0-9]/g, '');

  for (const word of BANNED_WORDS) {
    // Check if the banned word appears in the cleaned string
    if (cleaned.includes(word)) {
      return word;
    }
  }

  return null;
};

export const sanitizePlanName = (value: string) => sanitizeWhitespace(value);

export const validatePlanName = (value: string, options?: { allowEmpty?: boolean }): PlanNameValidationResult => {
  const trimmed = sanitizePlanName(value);

  if (!trimmed) {
    if (options?.allowEmpty) {
      return { isValid: true, sanitizedValue: trimmed };
    }
    return { isValid: false, error: 'Plan name is required.' };
  }

  if (!/[a-z0-9]/i.test(trimmed)) {
    return { isValid: false, error: 'Plan name must include letters or numbers.' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Plan name must be 100 characters or fewer.' };
  }

  const prohibited = findProhibitedSubstring(trimmed);
  if (prohibited) {
    return {
      isValid: false,
      error: 'Plan name contains inappropriate language. Please choose another name.'
    };
  }

  return { isValid: true, sanitizedValue: trimmed };
};

export type PlanNameValidationResult =
  | { isValid: true; sanitizedValue: string }
  | { isValid: false; error: string };
