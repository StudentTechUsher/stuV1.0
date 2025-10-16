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
  '$': 's'
};

const BANNED_WORDS = [
  'fuck',
  'fucks',
  'fucker',
  'fuckers',
  'fucking',
  'motherfucker',
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

const cachedRegex: Record<string, RegExp> = {};

const NON_ALNUM = '[^a-z0-9]+';

const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const buildWordPattern = (word: string) => {
  if (cachedRegex[word]) {
    return cachedRegex[word];
  }

  const letters = word.split('').map((ch) => escapeRegex(ch)).join(`${NON_ALNUM}?`);
  const pattern = new RegExp(`(^|${NON_ALNUM})${letters}(${NON_ALNUM}|$)`, 'i');
  cachedRegex[word] = pattern;
  return pattern;
};

const normalizeLeetSpeak = (value: string) =>
  value
    .toLowerCase()
    .split('')
    .map((char) => LEET_MAP[char] ?? char)
    .join('');

const sanitizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

export const findProhibitedSubstring = (value: string): string | null => {
  if (!value) return null;

  const normalized = sanitizeWhitespace(value).toLowerCase();
  const leetNormalized = normalizeLeetSpeak(normalized);

  for (const word of BANNED_WORDS) {
    const regex = buildWordPattern(word);
    if (regex.test(normalized) || regex.test(leetNormalized)) {
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
