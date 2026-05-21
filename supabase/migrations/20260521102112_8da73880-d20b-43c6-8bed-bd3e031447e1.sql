
-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 2. Allow admins to manage duel_questions
DROP POLICY IF EXISTS "admins insert duel questions" ON public.duel_questions;
CREATE POLICY "admins insert duel questions" ON public.duel_questions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update duel questions" ON public.duel_questions;
CREATE POLICY "admins update duel questions" ON public.duel_questions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins delete duel questions" ON public.duel_questions;
CREATE POLICY "admins delete duel questions" ON public.duel_questions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Stats RPC for the admin dashboard
CREATE OR REPLACE FUNCTION public.duel_question_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.duel_questions),
    'used',  (SELECT count(DISTINCT question_id) FROM public.duel_question_usage),
    'remaining', (
      SELECT count(*) FROM public.duel_questions dq
      WHERE NOT EXISTS (SELECT 1 FROM public.duel_question_usage u WHERE u.question_id = dq.id)
    )
  )
$$;
