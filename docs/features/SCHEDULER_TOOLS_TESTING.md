# Scheduler Tools Testing & Observability

This document describes how to test and debug the AI course scheduler tools independently.

## Quick Start

### Testing Tools Without Running the Full Agent

**Navigate to the test page:**
```
http://localhost:3000/test-scheduler-tools
```

**Test a course lookup:**
1. Enter University ID (usually `1`)
2. Enter Term Name (e.g., `Winter 2026`)
3. Enter Course Code (e.g., `CS 450`)
4. Click "Test Course Fetch"
5. **Open Browser Console (F12)** to see detailed logs

## Understanding the Logs

### Log Emoji Guide

| Emoji | Meaning | Example |
|-------|---------|---------|
| 🔍 | Query starting | `🔍 [getCourseOfferingsForCourse] Starting fetch` |
| ✅ | Success | `✅ [fetchCourseOfferingsForTerm] Database query succeeded` |
| ❌ | Error | `❌ [getCourseOfferingsForCourse] Error fetching` |
| ⚠️ | Warning | `⚠️ [getCourseOfferingsForCourse] No sections found` |
| 🧪 | Test execution | `🧪 [TEST API] Testing getCourseOfferingsForCourse` |

### Example Log Flow (Success)

```
🧪 Starting course offerings test...
🔍 [getCourseOfferingsForCourse] Starting fetch: {
  universityId: 1,
  termName: "Winter 2026",
  courseCode: "CS 450"
}
🔍 [fetchCourseOfferingsForTerm] Querying database: {
  originalTermName: "Winter 2026",
  normalizedTermName: "Winter 2026",
  courseCodes: ["CS 450"]
}
✅ [fetchCourseOfferingsForTerm] Database query succeeded: {
  resultCount: 3,
  foundCourses: ["CS 450"]
}
✅ [getCourseOfferingsForCourse] Fetched sections: {
  courseCode: "CS 450",
  sectionCount: 3
}
✅ [getCourseOfferingsForCourse] Enhanced sections with parsed meetings
```

### Example Log Flow (No Results)

```
🔍 [fetchCourseOfferingsForTerm] Querying database: {
  normalizedTermName: "Winter 2026",
  courseCodes: ["CS 999"]
}
✅ [fetchCourseOfferingsForTerm] Database query succeeded: {
  resultCount: 0,
  foundCourses: []
}
⚠️ [getCourseOfferingsForCourse] No sections found for course: {
  courseCode: "CS 999",
  termName: "Winter 2026"
}
```

## Common Issues & Solutions

### Issue: No sections found

**Symptoms:**
- Tool returns empty array
- Log shows: `⚠️ No sections found for course`

**Debug steps:**
1. Check term name normalization:
   ```
   Input: "Winter Semester 2026"
   Normalized: "Winter 2026"
   ```
2. Verify course exists in database:
   ```sql
   SELECT * FROM course_offerings
   WHERE university_id = 1
   AND term_name = 'Winter 2026'
   AND course_code = 'CS 450';
   ```
3. Check course code format:
   - ✅ Correct: `"CS 450"` (with space)
   - ❌ Wrong: `"CS450"` (no space)

### Issue: Database query fails

**Symptoms:**
- Error in logs: `❌ Database query failed`
- HTTP 500 error

**Debug steps:**
1. Check Supabase connection
2. Verify RLS policies allow read access
3. Check table permissions

### Issue: Term name mismatch

**Symptoms:**
- Works in test page but not in agent
- Different results between manual test and agent

**Solution:**
- Term names are normalized (removes "Semester", "Term")
- Check logs to see normalized vs original term names
- Grad plan: `"Winter Semester 2026"` → Database: `"Winter 2026"`

## Adding Logs to New Tools

When creating new tools, follow this pattern:

```typescript
export async function myNewTool(params: Params) {
  console.log('🔍 [myNewTool] Starting:', {
    timestamp: new Date().toISOString(),
    ...params
  });

  try {
    const result = await doSomething(params);

    console.log('✅ [myNewTool] Success:', {
      resultCount: result.length,
      // ... relevant metrics
    });

    return result;
  } catch (error) {
    console.error('❌ [myNewTool] Error:', {
      params,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
```

## Testing Checklist

Before deploying scheduler changes:

- [ ] Test with actual course codes from your database
- [ ] Test with various term name formats
- [ ] Test with courses that have no offerings
- [ ] Test with waitlisted sections
- [ ] Check console logs for warnings
- [ ] Verify term normalization is working
- [ ] Test with non-existent courses (should fail gracefully)

## Performance Monitoring

Each test shows execution time. Typical benchmarks:

| Operation | Expected Time |
|-----------|---------------|
| Get Course Offerings | < 500ms |
| Check Conflicts | < 100ms |
| Rank Sections | < 50ms |
| Save Selection | < 200ms |

If times exceed these significantly, investigate:
- Database query performance
- Network latency
- Large result sets

## Future Improvements

Potential enhancements:
- [ ] Add unit tests with Jest
- [ ] Add integration tests
- [ ] Create test data fixtures
- [ ] Add performance regression tests
- [ ] Create automated E2E tests
- [ ] Add OpenTelemetry tracing
- [ ] Create Grafana dashboard for production monitoring

## Related Files

- **Test Page**: `app/(dashboard)/test-scheduler-tools/page.tsx`
- **Test API**: `app/api/test-scheduler-tools/get-course-offerings/route.ts`
- **Tools**: `lib/mastra/tools/courseSelectionTools.ts`
- **Service**: `lib/services/generateScheduleService.ts`
