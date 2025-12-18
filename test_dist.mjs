import { distributionForTarget } from '../lib/gpa/core.js';

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
