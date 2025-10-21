-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.advisors (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  profile_id uuid,
  CONSTRAINT advisors_pkey PRIMARY KEY (id),
  CONSTRAINT advisors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.ai_prompts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  prompt_name text,
  prompt text,
  ai_model text DEFAULT 'gpt-5o-mini'::text,
  version real NOT NULL,
  max_output_tokens bigint NOT NULL DEFAULT '10000'::bigint CHECK (max_output_tokens > 0),
  CONSTRAINT ai_prompts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_responses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  response text,
  user_id uuid NOT NULL,
  user_prompt text NOT NULL DEFAULT 'Not collected'::text,
  output_tokens bigint NOT NULL DEFAULT '0'::bigint,
  route_context text,
  escalation_flag boolean,
  session_id text,
  CONSTRAINT ai_responses_pkey PRIMARY KEY (id),
  CONSTRAINT ai_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.career_options (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying NOT NULL,
  CONSTRAINT career_options_pkey PRIMARY KEY (id)
);
CREATE TABLE public.class_preferences (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  CONSTRAINT class_preferences_pkey PRIMARY KEY (id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['transcript'::text, 'resume'::text, 'other'::text])),
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded'::text CHECK (status = ANY (ARRAY['uploaded'::text, 'parsing'::text, 'parsed'::text, 'failed'::text])),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.grad_plan (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  student_id bigint,
  is_active boolean NOT NULL DEFAULT false,
  plan_details json,
  pending_approval boolean NOT NULL DEFAULT false,
  advisor_notes text,
  programs_in_plan ARRAY,
  pending_edits boolean NOT NULL DEFAULT false,
  plan_name text DEFAULT ''::text,
  CONSTRAINT grad_plan_pkey PRIMARY KEY (id),
  CONSTRAINT grad_plan_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student(id)
);
CREATE TABLE public.institution_settings (
  university_id integer NOT NULL,
  selection_mode text NOT NULL DEFAULT 'MANUAL'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT institution_settings_pkey PRIMARY KEY (university_id),
  CONSTRAINT institution_settings_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.university(id),
  CONSTRAINT institution_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  initiator_user_id uuid,
  type text NOT NULL CHECK (char_length(type) <= 100),
  context_json jsonb,
  url text CHECK (char_length(url) <= 512),
  is_read boolean NOT NULL DEFAULT false,
  read_utc timestamp with time zone,
  created_utc timestamp with time zone NOT NULL DEFAULT now(),
  channel_mask integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'sent'::text, 'failed'::text])),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_initiator_user_id_fkey FOREIGN KEY (initiator_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  fname character varying NOT NULL DEFAULT 'New'::character varying,
  lname character varying NOT NULL DEFAULT 'User'::character varying,
  university_id bigint NOT NULL DEFAULT '1'::bigint,
  role_id bigint NOT NULL DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  onboarded boolean NOT NULL DEFAULT false,
  authorization_agreed boolean NOT NULL DEFAULT false,
  authorization_agreed_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  est_grad_date date,
  est_grad_sem text,
  career_goals text,
  notif_preferences jsonb DEFAULT '{"events": {"inbox.new": {"push": true, "email": true}}}'::jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.university(id),
  CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.program (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  university_id bigint NOT NULL,
  program_type USER-DEFINED,
  version text NOT NULL DEFAULT 'v1.0'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  modified_at timestamp without time zone DEFAULT now(),
  requirements json,
  is_general_ed boolean NOT NULL,
  course_flow jsonb,
  classic_view jsonb,
  CONSTRAINT program_pkey PRIMARY KEY (id),
  CONSTRAINT program_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.university(id)
);
CREATE TABLE public.roles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  modified_at timestamp with time zone DEFAULT now(),
  name character varying NOT NULL,
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.student (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  profile_id uuid UNIQUE,
  selected_programs ARRAY,
  selected_interests ARRAY,
  targeted_career text DEFAULT 'Not Chosen'::text,
  class_preferences ARRAY,
  year_in_school USER-DEFINED NOT NULL DEFAULT 'Freshman'::"Year In School",
  CONSTRAINT student_pkey PRIMARY KEY (id),
  CONSTRAINT student_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.student_interests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying NOT NULL DEFAULT ''::character varying UNIQUE,
  CONSTRAINT student_interests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.university (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL UNIQUE,
  domain character varying DEFAULT ''::character varying,
  primary_color character varying,
  secondary_color character varying,
  accent_color character varying,
  dark_color character varying,
  light_color character varying,
  text_color character varying,
  secondary_text_color character varying,
  subdomain text NOT NULL DEFAULT ''::text UNIQUE,
  CONSTRAINT university_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inserted_at timestamp with time zone NOT NULL DEFAULT now(),
  courses jsonb,
  CONSTRAINT user_courses_pkey PRIMARY KEY (id),
  CONSTRAINT user_courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);