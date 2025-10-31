import { distributionForTarget } from './lib/gpa/core.ts';

// Test 1: Simple case
const result1 = distributionForTarget(60, 210, [
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
  { credits: 4 },
], 3.5);

console.log('Test 1 (60 credits @3.5 GPA, need 40 more @3.5):', result1);

// Test 2: With locked goals
const result2 = distributionForTarget(
  60,
  210,
  [
    { credits: 20, goalGrade: 'A' },
    { credits: 20 },
  ],
  3.5
);

console.log('\nTest 2 (with locked 20 A):', result2);
