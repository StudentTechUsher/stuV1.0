# Grad Plan Chatbot Implementation Roadmap

## Overview
AI-powered conversational interface for creating graduation plans with step-by-step data collection and tool integration.

---

## Conversation Flow Summary

1. **Initialize** → Fetch university data and student record
2. **Profile Setup** → Collect/update: est_grad_date, est_grad_sem, career_goals
3. **Career Pathfinder** (optional) → Help find target career
4. **Transcript Upload** (conditional) → Upload/update transcript if needed
5. **Student Type** → Undergraduate or Graduate selection
6. **Program Selection** → Choose major/minor/grad programs (with pathfinder)
7. **Course Selection Method** → AI-chosen or manual selection
8. **Course Selection** (if manual) → Select courses for each program requirement
9. **Elective Courses** (conditional) → Add elective courses if required
10. **Additional Concerns** → Free-text input for special considerations
11. **AI Generation** → Stream reasoning and generate grad plan JSON

---

## Implementation Phases

### Phase 1: Foundation & Core Infrastructure ✅ DONE
- [x] Create `/grad-plan3/create` page structure
- [x] Build basic chatbot UI with chat area and progress sidebar
- [x] Set up navigation from PlanHeader

### Phase 2: Conversation State Management ✅ DONE
**Files to Create:**
- [x] `lib/chatbot/grad-plan/conversationState.ts` - State machine and conversation flow
- [x] `lib/chatbot/grad-plan/types.ts` - TypeScript interfaces for conversation state
- [x] `lib/chatbot/grad-plan/stateManager.ts` - Functions to update and track state
- [x] `lib/chatbot/grad-plan/statePersistence.ts` - Save/load state from localStorage/DB

**Key Components:**
```typescript
interface ConversationState {
  currentStep: ConversationStep;
  collectedData: {
    universityId: number;
    studentId: string;
    estGradDate: string | null;
    estGradSem: string | null;
    careerGoals: string | null;
    hasTranscript: boolean;
    needsTranscriptUpdate: boolean;
    studentType: 'undergraduate' | 'graduate' | null;
    selectedPrograms: number[];
    courseSelectionMethod: 'ai' | 'manual' | null;
    selectedCourses: CourseSelection[];
    electiveCourses: Course[];
    additionalConcerns: string | null;
  };
  completedSteps: ConversationStep[];
  pendingActions: string[];
}

enum ConversationStep {
  INITIALIZE = 'initialize',
  PROFILE_SETUP = 'profile_setup',
  CAREER_PATHFINDER = 'career_pathfinder',
  TRANSCRIPT_CHECK = 'transcript_check',
  STUDENT_TYPE = 'student_type',
  PROGRAM_SELECTION = 'program_selection',
  COURSE_METHOD = 'course_method',
  COURSE_SELECTION = 'course_selection',
  ELECTIVES = 'electives',
  ADDITIONAL_CONCERNS = 'additional_concerns',
  GENERATING_PLAN = 'generating_plan',
  COMPLETE = 'complete',
}
```

### Phase 3: Tool Definitions (OpenAI Function Calling) 🔄 IN PROGRESS
**Files to Create:**
- [ ] `lib/chatbot/tools/universityTool.ts` - Fetch university information
- [ ] `lib/chatbot/tools/studentRecordTool.ts` - Get student data
- [x] `lib/chatbot/tools/profileUpdateTool.ts` - Update profile fields ✅
- [x] `lib/chatbot/tools/transcriptCheckTool.ts` - Transcript status check ✅
- [x] `lib/chatbot/tools/studentTypeTool.ts` - Student type selection ✅
- [ ] `lib/chatbot/tools/careerPathfinderTool.ts` - Career exploration tool
- [x] `lib/chatbot/tools/programSelectionTool.ts` - Program picker tool ✅
- [x] `lib/chatbot/tools/courseSelectionTool.ts` - Course selection tool ✅
- [ ] `lib/chatbot/tools/electiveSelectionTool.ts` - Elective selection tool
- [ ] `lib/chatbot/tools/toolDefinitions.ts` - OpenAI function schemas
- [ ] `lib/chatbot/tools/toolExecutor.ts` - Execute tool calls

**Tool Schema Structure:**
```typescript
interface ChatbotTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (params: unknown) => Promise<ToolResult>;
}
```

### Phase 4: UI Components for Tools 🔄 IN PROGRESS
**Files to Create:**
- [x] `components/chatbot-tools/ProfileUpdateForm.tsx` - Profile update UI ✅
- [x] `components/chatbot-tools/TranscriptCheckForm.tsx` - Transcript check UI ✅
- [x] `components/chatbot-tools/StudentTypeForm.tsx` - Student type selection UI ✅
- [ ] `components/chatbot-tools/CareerPathfinder.tsx` - Career exploration UI
- [x] `components/chatbot-tools/ProgramSelectionForm.tsx` - Program selection UI ✅
- [x] `components/chatbot-tools/CourseSelectionForm.tsx` - Course selection UI ✅
- [ ] `components/chatbot-tools/ElectiveSelector.tsx` - Elective selection UI
- [x] `components/chatbot-tools/ToolRenderer.tsx` - Dynamic tool component renderer ✅

**Integration Pattern:**
- Tools render as interactive cards in the chat
- User interactions send results back to conversation
- Progress sidebar updates in real-time

### Phase 5: OpenAI Integration 🤖 PENDING
**Files to Create:**
- [ ] `lib/chatbot/openai/chatService.ts` - OpenAI API integration
- [ ] `lib/chatbot/openai/promptTemplates.ts` - System prompts for each step
- [ ] `lib/chatbot/openai/streamHandler.ts` - Handle streaming responses
- [ ] `app/api/chatbot/route.ts` - API endpoint for chat messages

**Key Features:**
- GPT-4 with function calling
- Streaming responses for reasoning
- Context management (conversation history)
- Error handling and retries

### Phase 6: Server Actions & Services 🔧 PENDING
**Files to Create:**
- [ ] `lib/services/chatbotService.ts` - Core chatbot business logic
- [ ] `lib/services/gradPlanGenerationService.ts` - Generate final plan JSON
- [ ] `lib/services/server-actions.ts` - Add chatbot server actions

**Server Actions Needed:**
```typescript
- sendChatMessage(message: string, conversationId: string)
- executeToolAction(toolName: string, params: unknown)
- generateGradPlan(conversationState: ConversationState)
- saveConversation(conversationId: string, state: ConversationState)
- loadConversation(conversationId: string)
```

### Phase 7: Grad Plan Generation Logic 🎓 PENDING
**Files to Create:**
- [ ] `lib/chatbot/planGeneration/planBuilder.ts` - Build plan structure
- [ ] `lib/chatbot/planGeneration/courseScheduler.ts` - Schedule courses by term
- [ ] `lib/chatbot/planGeneration/requirementMatcher.ts` - Match courses to requirements
- [ ] `lib/chatbot/planGeneration/validator.ts` - Validate plan completeness

**Output Format:**
- JSON structure matching existing grad_plans table schema
- Validation against program requirements
- Credit hour calculations
- Prerequisite checking

### Phase 8: Enhanced UI Features ✨ PENDING
**Files to Create:**
- [ ] `components/chatbot/StreamingReasoning.tsx` - Display AI reasoning
- [ ] `components/chatbot/PlanPreview.tsx` - Preview generated plan
- [ ] `components/chatbot/ProgressTracker.tsx` - Enhanced progress sidebar
- [ ] `components/chatbot/MessageRenderer.tsx` - Rich message formatting

**Features:**
- Markdown support in messages
- Code blocks for showing plan snippets
- Loading states and animations
- Error messages and retry options

### Phase 9: State Persistence & Recovery 💾 PENDING
**Files to Create:**
- [ ] `lib/chatbot/persistence/conversationStorage.ts` - Save/load conversations
- [ ] Database migration for `chatbot_conversations` table

**Features:**
- Save conversation state to database
- Resume incomplete conversations
- Conversation history
- Auto-save on each step

### Phase 10: Testing & Polish 🧪 PENDING
**Files to Create:**
- [ ] `__tests__/chatbot/conversationFlow.test.ts`
- [ ] `__tests__/chatbot/toolExecution.test.ts`
- [ ] `__tests__/chatbot/planGeneration.test.ts`

---

## Tool Details

### 1. University Info Tool
**Purpose:** Fetch university-specific data (programs, courses, requirements)
**When Called:** Start of conversation
**Returns:** University configuration, available programs, course catalog

### 2. Student Record Tool
**Purpose:** Get student's current profile and academic data
**When Called:** Start of conversation (after university info)
**Returns:** Profile data, course history, current programs

### 3. Profile Update Tool
**Purpose:** Collect/update est_grad_date, est_grad_sem, career_goals
**When Called:** After fetching student record
**UI Component:** Interactive form with conditional required fields
**Validation:**
- If fields are null → Required
- If fields have values → Optional (show current, allow update)

### 4. Career Pathfinder Tool
**Purpose:** Help student find their target career
**When Called:** When user clicks "Help me find my target career"
**UI Component:** Career exploration interface (similar to existing pathfinder)
**Returns:** Selected career goal

### 5. Transcript Upload Tool
**Purpose:** Upload or update student transcript
**When Called:**
- If no user_courses entry → Ask if relevant
- If user_courses exists → Ask if update needed
**UI Component:** Reuse existing TranscriptUpload component
**Returns:** Confirmation of upload

### 6. Program Selection Tool (Undergraduate)
**Purpose:** Select major(s), minor(s), general education
**UI Component:** Program search/selection interface
**Returns:** Array of selected program IDs

### 7. Program Selection Tool (Graduate)
**Purpose:** Select graduate program(s)
**UI Component:** Graduate program selection interface
**Returns:** Array of selected program IDs

### 8. Course Selection Tool
**Purpose:** Manually select courses for each program requirement
**When Called:** If user chooses manual course selection
**UI Component:** Requirement-by-requirement course picker
**Returns:** Mapping of courses to requirements

### 9. Elective Selection Tool
**Purpose:** Add elective courses beyond program requirements
**When Called:** If programs require electives
**UI Component:** Course search and selection
**Returns:** Array of elective courses

---

## Data Flow

```
User Message
    ↓
OpenAI API (with function calling)
    ↓
Tool Call? → YES → Execute Tool → Update State → Show UI Component
    ↓                                    ↓
    NO                              User Interacts
    ↓                                    ↓
Generate Response                    Send Result
    ↓                                    ↓
Stream to User  ←─────────────────────────┘
    ↓
Update Progress Sidebar
```

---

## Current Status

### ✅ Completed
- **Phase 1:** Basic page structure and chat UI
- **Phase 2:** Conversation state management (complete)
- **Profile Update Tool:** First complete tool implementation
  - Tool definition with OpenAI schema
  - ProfileUpdateForm UI component
  - Server action for profile updates
  - Tool integration in conversation flow
  - Progress bar with pipe-style connections
- Chat UI with message display
- Input field and send functionality
- Progress sidebar with collected information
- Navigation integration

### 🔄 In Progress
- **Phase 3:** Tool Definitions (5/9 tools complete - 56%)
- **Phase 4:** UI Components (6/8 components complete - 75%)

### 📋 Next Steps (Priority Order)
1. **Test Profile Update Tool** - Verify end-to-end flow works
2. **Set up OpenAI integration** (Phase 5) - Enable actual AI conversations
3. **Build remaining tools** - Career Pathfinder, Transcript Upload, etc.
4. **Implement complete conversation flow** (Steps 1-11)
5. **Add plan generation logic** (Phase 7)

---

## Files Created So Far

### Phase 1 & 2 - Foundation & State Management
- ✅ `app/(dashboard)/grad-plan3/create/page.tsx` - Server component
- ✅ `app/(dashboard)/grad-plan3/create/create-plan-client.tsx` - Client component with tool integration
- ✅ `lib/chatbot/grad-plan/types.ts` - TypeScript interfaces and enums
- ✅ `lib/chatbot/grad-plan/stateManager.ts` - State management functions
- ✅ `lib/chatbot/grad-plan/conversationState.ts` - State machine logic
- ✅ `lib/chatbot/grad-plan/statePersistence.ts` - localStorage persistence
- ✅ `components/chatbot/ConversationProgressSteps.tsx` - Progress indicator with pipes

### Phase 3 & 4 - Complete Tools
**Profile Update Tool:**
- ✅ `lib/chatbot/tools/profileUpdateTool.ts` - Tool definition and schema
- ✅ `components/chatbot-tools/ProfileUpdateForm.tsx` - Form UI component
- ✅ `lib/services/server-actions.ts` - Added `updateProfileForChatbotAction`

**Transcript Check Tool:**
- ✅ `lib/chatbot/tools/transcriptCheckTool.ts` - Tool definition and schema
- ✅ `components/chatbot-tools/TranscriptCheckForm.tsx` - Form UI component
- ✅ `app/(dashboard)/grad-plan3/create/page.tsx` - Added hasCourses check

**Student Type Tool:**
- ✅ `lib/chatbot/tools/studentTypeTool.ts` - Tool definition and schema
- ✅ `components/chatbot-tools/StudentTypeForm.tsx` - Form UI component

**Program Selection Tool:**
- ✅ `lib/chatbot/tools/programSelectionTool.ts` - Tool definition and schema
- ✅ `components/chatbot-tools/ProgramSelectionForm.tsx` - Form UI component with auto-selection

**Course Selection Tool:**
- ✅ `lib/chatbot/tools/courseSelectionTool.ts` - Tool definition and schema
- ✅ `components/chatbot-tools/CourseSelectionForm.tsx` - Complex form UI with requirement-by-requirement selection
- ✅ Integrated course selection into conversation flow

**Shared Components:**
- ✅ `components/chatbot-tools/ToolRenderer.tsx` - Dynamic tool renderer

### Updated Files
- ✅ `components/grad-planner/PlanHeader.tsx` - Added navigation to create page

---

## Dependencies Needed

### NPM Packages
- `openai` - OpenAI SDK for Node.js
- `zod` - Schema validation for tool parameters
- `react-markdown` - Markdown rendering in messages
- `zustand` (optional) - State management for complex UI

---

## Database Schema Changes

### New Table: `chatbot_conversations`
```sql
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  conversation_state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  grad_plan_id UUID REFERENCES grad_plans(id)
);
```

---

## Notes & Considerations

1. **Tool Execution Order:** Tools must be called in sequence as some depend on previous data
2. **Error Handling:** Each tool needs graceful error handling and user-friendly messages
3. **Validation:** Validate all user inputs before proceeding to next step
4. **State Recovery:** Allow users to resume incomplete conversations
5. **AI Safety:** Include guardrails to prevent hallucination in plan generation
6. **Performance:** Consider caching university/program data
7. **Mobile:** Ensure all tool UIs work on mobile devices
8. **Answer Editing (Future Enhancement):**
   - **Current Implementation:** Answers are locked in once submitted (read-only display)
   - **Future Phase:** Add edit functionality with warnings about clearing dependent steps
   - **Approach:** "Lock and Warn" - Allow edits but warn users that changing a step will reset all subsequent steps
   - **Priority:** Phase 8+ (after core flow is complete)

---

## Timeline Estimate

- **Phase 2-3:** 2-3 days (State management + Tool definitions)
- **Phase 4:** 5-7 days (UI components for all tools)
- **Phase 5:** 2-3 days (OpenAI integration)
- **Phase 6:** 2-3 days (Server actions)
- **Phase 7:** 3-5 days (Plan generation logic)
- **Phase 8-10:** 3-5 days (Polish, testing, refinement)

**Total Estimated Time:** 17-26 days of development

---

*Last Updated: 2025-01-15*

---

## Recent Progress (2025-01-15)

### ✅ Completed: First Complete Tool Implementation

Successfully implemented the **Profile Update Tool** - the first fully functional tool in the chatbot system:

**What was built:**
1. **Tool Definition** (`profileUpdateTool.ts`)
   - OpenAI function calling schema
   - Zod validation schema
   - Helper function to check if profile update is needed

2. **UI Component** (`ProfileUpdateForm.tsx`)
   - Material-UI form with three fields (grad date, semester, career goals)
   - Shows current values if they exist
   - Validation and submit handling
   - Optional skip functionality

3. **Server Integration** (`server-actions.ts`)
   - `updateProfileForChatbotAction` with authentication
   - Updates profile fields in database
   - Returns typed success/error responses

4. **Conversation Integration** (`create-plan-client.tsx`)
   - Tool rendering in chat messages
   - Tool completion handling
   - State updates after tool completion
   - Progress tracking integration
   - Disables chat input while tool is active

**How it works:**
1. On page load, checks if user profile needs updates
2. If needed, displays welcome message + ProfileUpdateForm
3. User fills out form (or skips if values already exist)
4. On submit, updates database via server action
5. Updates conversation state with collected data
6. Marks PROFILE_SETUP step as complete
7. Advances to next step (TRANSCRIPT_CHECK)

**Testing:**
- Dev server running on http://localhost:3001
- Navigate to `/grad-plan3` → Click "Create New Plan"
- Profile update form should appear if profile incomplete

**Next Steps:**
- Test the complete flow in browser
- Build Transcript Check tool (next step in conversation)
- Set up OpenAI integration for actual AI responses
