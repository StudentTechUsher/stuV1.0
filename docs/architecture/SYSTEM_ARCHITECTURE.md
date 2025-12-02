  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                              STU v1.0 - ACADEMIC ADVISING PLATFORM               │
  │                              Next.js 15 + Supabase + OpenAI                      │
  └──────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────────────┐
  │                                   PRESENTATION LAYER                             │
  ├──────────────────────────────────────────────────────────────────────────────────┤
  │                                                                                  │
  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐       │
  │  │   PUBLIC ROUTES     │  │  AUTH ROUTES        │  │  DASHBOARD ROUTES   │       │
  │  │   app/              │  │  app/auth/          │  │  app/(dashboard)/   │       │
  │  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤       │
  │  │ • Landing (/)       │  │ • Login             │  │ • Dashboard         │       │
  │  │ • About Us          │  │ • Signup            │  │ • Grad Plan *       │       │
  │  │ • How It Works      │  │ • Authorize         │  │ • Profile           │       │
  │  │ • Privacy Policy    │  │ • Create Account    │  │ • Advisees          │       │
  │  │ • Demo              │  └─────────────────────┘  │ • Academic History  │       │
  │  └─────────────────────┘                           │ • Pathfinder        │       │
  │                                                    │ • GPA Calculator    │       │         
  │                                                    │ • Scheduler         │       │        
  │                                                    │ • Appointments      │       │        
  │  ┌──────────────────────────────────────────────┐  │ • Inbox             │       │
  │  │         REACT COMPONENTS                     │  │ • Settings          │       │
  │  │         components/                          │  │ • Admin Tools       │       │
  │  ├──────────────────────────────────────────────┤  └─────────────────────┘       │
  │  │ • Chatbot (AI-powered advisor)               │         * Core Feature         │        
  │  │ • Grad Planner (drag-drop planning)          │                                │        
  │  │ • Transcript Upload & Parser                 │                                │        
  │  │ • Pathfinder (career exploration)            │                                │        
  │  │ • Scheduler (semester scheduling)            │                                │        
  │  │ • Profile Management                         │                                │        
  │  │ • Navigation (Navbar, Footer)                │                                │        
  │  │ • UI Components (MUI + Radix + Custom)       │                                │        
  │  └──────────────────────────────────────────────┘                                │        
  │                                                                                  │      
  └───────────────────────────────────────────┬──────────────────────────────────────┘      
                                              │
                                              ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐       
  │                                    API LAYER                                     │      
  │                                  app/api/                                        │      
  ├──────────────────────────────────────────────────────────────────────────────────┤       
  │                                                                                  │      
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
  │  │   CHATBOT    │  │   PROFILE    │  │   CAREERS    │  │   PROGRAMS   │          │
  │  │              │  │              │  │              │  │              │          │
  │  │ • /chatbot/  │  │ • /profile/  │  │ • /careers/  │  │ • /programs/ │          │
  │  │   stream     │  │   courses    │  │   [slug]     │  │   batch      │          │
  │  │ • /openai/   │  │ • linkedin   │  │ • publish    │  │ • student-   │          │
  │  │   chat       │  │   -upload    │  │ • save-draft │  │   types      │          │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘          │
  │                                                                                  │      
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
  │  │ TRANSCRIPT   │  │  GRAD PLAN   │  │ WITHDRAWALS  │  │    EMAIL     │          │
  │  │              │  │              │  │              │  │              │          │
  │  │ • /transc-   │  │ • /grad-     │  │ • /withdraw- │  │ • /send-     │          │
  │  │   ript/parse │  │   plan/      │  │   als/outbox │  │   email      │          │
  │  │              │  │   generate   │  │ • weekly     │  │ • /email-    │          │
  │  │              │  │              │  │   job        │  │   testing    │          │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘          │
  │                                                                                  │      
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                            │        
  │  │     GPA      │  │  ADMIN       │  │    DEV       │                            │        
  │  │              │  │              │  │              │                            │        
  │  │ • /gpa/      │  │ • /admin/    │  │ • /dev/      │                            │        
  │  │   context    │  │   forecast   │  │   upload-    │                            │        
  │  │ • distribu-  │  │ • /institu-  │  │   courses    │                            │        
  │  │   tion       │  │   tions      │  │              │                            │        
  │  └──────────────┘  └──────────────┘  └──────────────┘                            │        
  │                                                                                  │      
  └───────────────────────────────────────┬──────────────────────────────────────────┘      
                                          │ (thin HTTP wrappers)
                                          ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐       
  │                              BUSINESS LOGIC LAYER                                │      
  │                          lib/services/ (Service Layer)                           │      
  ├──────────────────────────────────────────────────────────────────────────────────┤       
  │                                                                                  │      
  │  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐    │
  │  │  CORE DOMAIN          │  │  AI & CHAT            │  │  ACADEMIC DATA     │    │
  │  │  SERVICES             │  │  SERVICES             │  │  SERVICES          │    │
  │  ├───────────────────────┤  ├───────────────────────┤  ├────────────────────┤    │
  │  │ • gradPlanService     │  │ • openaiService       │  │ • transcriptSvc    │    │
  │  │ • programService      │  │ • aiChatService       │  │ • userCoursesSvc   │    │
  │  │ • profileService      │  │ • aiDbService         │  │ • gpaService       │    │
  │  │   (.ts + .server.ts)  │  │ • conversationSvc     │  │ • courseOffering   │    │
  │  │ • institutionService  │  └───────────────────────┘  │   Service          │    │
  │  └───────────────────────┘                             │ • courseMatching   │    │
  │                                                        │   Service          │    │        
  │  ┌───────────────────────┐  ┌───────────────────────┐  │ • courseRecomm     │    │
  │  │  SUPPORT SERVICES     │  │  INTEGRATION          │  │   endationSvc      │    │
  │  │                       │  │  SERVICES             │  └────────────────────┘    │
  │  ├───────────────────────┤  ├───────────────────────┤                            │
  │  │ • careerService       │  │ • emailService        │                            │
  │  │ • notifService        │  │   (Resend)            │                            │
  │  │ • withdrawalService   │  │ • auth.ts             │                            │
  │  │ • escalationService   │  │   (Supabase Auth)     │                            │
  │  │ • utilityService      │  └───────────────────────┘                            │
  │  └───────────────────────┘                                                       │        
  │                                                                                  │      
  │  ┌────────────────────────────────────────────────────────────────────────────┐  │       
  │  │  SERVER ACTIONS (server-actions.ts, client-actions.ts)                     │  │       
  │  │  • Wraps service functions for client-side consumption                     │  │       
  │  └────────────────────────────────────────────────────────────────────────────┘  │       
  │                                                                                  │      
  └───────────────────────────────────────┬──────────────────────────────────────────┘      
                                          │
                                          ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐       
  │                                DATA ACCESS LAYER                                 │      
  ├──────────────────────────────────────────────────────────────────────────────────┤       
  │                                                                                  │      
  │  ┌────────────────────────────────────────────────────────────────────────────┐  │       
  │  │                          SUPABASE CLIENT                                   │  │      
  │  │                          lib/supabase/                                     │  │      
  │  ├────────────────────────────────────────────────────────────────────────────┤  │       
  │  │ • client.ts        - Browser Supabase client factory                       │  │       
  │  │ • server.ts        - Server Supabase client factory (RSC & Server Actions) │  │       
  │  │ • supabase.ts      - Shared Supabase client                                │  │       
  │  │                                                                            │  │      
  │  │ Features:                                                                  │  │      
  │  │ • Environment-based switching (dev/prod)                                   │  │       
  │  │ • Auth session management                                                  │  │       
  │  │ • Row Level Security (RLS) enforcement                                     │  │       
  │  └────────────────────────────────────────────────────────────────────────────┘  │       
  │                                                                                  │      
  │  ┌────────────────────────────────────────────────────────────────────────────┐  │       
  │  │                       DATABASE TYPES                                       │  │      
  │  │                       lib/database/types.ts                                │  │      
  │  ├────────────────────────────────────────────────────────────────────────────┤  │       
  │  │ • Auto-generated from Supabase schema                                      │  │       
  │  │ • TypeScript types for all tables                                          │  │       
  │  │ • Enums, relationships, and foreign keys                                   │  │       
  │  └────────────────────────────────────────────────────────────────────────────┘  │       
  │                                                                                  │      
  └───────────────────────────────────────┬──────────────────────────────────────────┘      
                                          │
                                          ▼
  ┌──────────────────────────────────────────────────────────────────────────────────┐       
  │                              SUPABASE (PostgreSQL)                               │      
  ├──────────────────────────────────────────────────────────────────────────────────┤       
  │                                                                                  │      
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
  │  │    CORE      │  │   ACADEMIC   │  │     AI       │  │  ENGAGEMENT  │          │
  │  │    TABLES    │  │    TABLES    │  │   TABLES     │  │    TABLES    │          │
  │  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
  │  │ • profiles   │  │ • programs   │  │ • ai_prompts │  │ • appoint-   │          │
  │  │ • advisors   │  │ • courses    │  │ • ai_resp-   │  │   ments      │          │
  │  │ • institu-   │  │ • user_      │  │   onses      │  │ • notifica-  │          │
  │  │   tions      │  │   courses    │  │ • conversa-  │  │   tions      │          │
  │  │              │  │ • graduation │  │   tions      │  │ • withdraw-  │          │
  │  │              │  │   _plans     │  │              │  │   als        │          │
  │  │              │  │ • program_   │  │              │  │ • escalation │          │
  │  │              │  │   require-   │  │              │  │   s          │          │
  │  │              │  │   ments      │  │              │  │              │          │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘          │
  │                                                                                  │      
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                            │        
  │  │   CAREERS    │  │   STORAGE    │  │     AUTH     │                            │        
  │  ├──────────────┤  ├──────────────┤  ├──────────────┤                            │        
  │  │ • careers    │  │ • transcripts│  │ • auth.users │                            │        
  │  │ • career_    │  │ • linkedin_  │  │ • Row Level  │                            │        
  │  │   skills     │  │   profiles   │  │   Security   │                            │        
  │  └──────────────┘  └──────────────┘  └──────────────┘                            │        
  │                                                                                  │      
  └──────────────────────────────────────────────────────────────────────────────────┘       

  ┌──────────────────────────────────────────────────────────────────────────────────┐       
  │                              EXTERNAL INTEGRATIONS                               │      
  ├──────────────────────────────────────────────────────────────────────────────────┤       
  │                                                                                  │      
  │  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐             │
  │  │   OPENAI API      │  │   RESEND EMAIL    │  │   CALENDLY        │             │
  │  │   (GPT-4)         │  │   SERVICE         │  │   (Appointments)  │             │
  │  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤             │
  │  │ • AI Chatbot      │  │ • Transactional   │  │ • Advisor         │             │
  │  │ • Career Suggest  │  │   emails          │  │   scheduling      │             │
  │  │ • Program Suggest │  │ • Notifications   │  │ • Meeting booking │             │
  │  │ • Plan Generation │  │ • Withdrawal      │  │                   │             │
  │  │ • Course Matching │  │   alerts          │  │                   │             │
  │  └───────────────────┘  └───────────────────┘  └───────────────────┘             │
  │                                                                                  │      
  └──────────────────────────────────────────────────────────────────────────────────┘       

  ┌──────────────────────────────────────────────────────────────────────────────────┐       
  │                                   KEY FEATURES                                   │      
  ├──────────────────────────────────────────────────────────────────────────────────┤       
  │                                                                                  │      
  │  1. AI-POWERED GRADUATION PLANNER                                                │       
  │     • Drag-and-drop semester planning with requirement tracking                  │       
  │     • AI-generated plans based on transcript + program requirements              │       
  │     • Validation against course prerequisites and constraints                    │       
  │                                                                                  │      
  │  2. CONVERSATIONAL AI CHATBOT                                                    │       
  │     • Multi-step conversation flow with state management                         │       
  │     • Profile updates, career suggestions, program recommendations               │       
  │     • Integration with OpenAI streaming API                                      │       
  │                                                                                  │      
  │  3. TRANSCRIPT PARSER                                                            │       
  │     • PDF upload and parsing (AI-powered extraction)                             │       
  │     • Automatic course mapping and GPA calculation                               │       
  │     • Bulk course import into user profile                                       │       
  │                                                                                  │      
  │  4. PATHFINDER (CAREER EXPLORATION)                                              │       
  │     • Career-major matching visualization                                        │       
  │     • Major pivot analysis with program overlap                                  │       
  │     • Skills gap analysis and adjacent career paths                              │       
  │                                                                                  │      
  │  5. ROLE-BASED ACCESS CONTROL                                                    │       
  │     • Students, Advisors, Admins with different permissions                      │       
  │     • FERPA-compliant data access policies                                       │       
  │     • RLS enforcement at database layer                                          │       
  │                                                                                  │      
  └──────────────────────────────────────────────────────────────────────────────────┘       

  ┌──────────────────────────────────────────────────────────────────────────────────┐       
  │                               TECHNOLOGY STACK                                   │      
  ├──────────────────────────────────────────────────────────────────────────────────┤       
  │                                                                                  │      
  │  Frontend:  Next.js 15 (App Router), React 19, TypeScript                        │       
  │  UI:        MUI (Material-UI), Radix UI, Tailwind CSS, Framer Motion             │       
  │  State:     Zustand (global state), React Hook Form (forms)                      │       
  │  Backend:   Next.js API Routes, Server Components, Server Actions                │       
  │  Database:  Supabase (PostgreSQL + Auth + Storage + RLS)                         │       
  │  AI:        OpenAI GPT-4 (via openaiService)                                     │       
  │  Email:     Resend                                                               │      
  │  Testing:   Vitest, Testing Library                                              │       
  │  Deploy:    Vercel                                                               │      
  │                                                                                  │      
  └──────────────────────────────────────────────────────────────────────────────────┘       