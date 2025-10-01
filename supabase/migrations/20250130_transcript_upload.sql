-- Transcript Upload Feature Migration
-- Creates tables, storage bucket, and RLS policies for transcript parsing

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcripts',
  'transcripts',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CREATE DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('transcript', 'resume', 'other')),
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsing', 'parsed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- =====================================================
-- 3. CREATE USER_COURSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  subject TEXT NOT NULL,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  credits NUMERIC(4,2) NOT NULL,
  grade TEXT,
  source_document UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_course UNIQUE (user_id, subject, number, term)
);

CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_source_doc ON public.user_courses(source_document);

-- =====================================================
-- 4. RLS POLICIES - DOCUMENTS
-- =====================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. RLS POLICIES - USER_COURSES
-- =====================================================
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- Users can view their own courses
CREATE POLICY "Users can view own courses"
  ON public.user_courses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own courses
CREATE POLICY "Users can insert own courses"
  ON public.user_courses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own courses
CREATE POLICY "Users can update own courses"
  ON public.user_courses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own courses
CREATE POLICY "Users can delete own courses"
  ON public.user_courses
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. STORAGE POLICIES
-- =====================================================

-- Users can upload to their own folder
CREATE POLICY "Users can upload own transcripts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'transcripts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own transcripts
CREATE POLICY "Users can view own transcripts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'transcripts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own transcripts
CREATE POLICY "Users can delete own transcripts"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'transcripts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- 7. UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_courses_updated_at
  BEFORE UPDATE ON public.user_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
