-- supabase/migrations/001_init.sql

-- Ensure default Supabase schema privileges are restored on the public schema
-- (Crucial if the schema was dropped and recreated)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- Enable UUID generation extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at automatic update trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- 1. PROFILES Table (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for profiles updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger function to automatically insert profile on auth.users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, job_title)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'job_title'
  );
  RETURN new;
END;
$$;

-- Trigger binding for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. WORKSPACES Table
CREATE TABLE public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for workspaces updated_at
CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 3. WORKSPACE_MEMBERS Table
CREATE TABLE public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (workspace_id, user_id)
);


-- 4. PROJECTS Table
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'completed')) DEFAULT 'active',
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for projects updated_at
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 5. TASKS Table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')) DEFAULT 'todo',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date DATE,
  assignee_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for tasks updated_at
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--------------------------------------------------------------------------------
-- SECURITY DEFINER Helper Functions (Prevents RLS Recursion Loops)
--------------------------------------------------------------------------------

-- Check if current user is member of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(w_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = w_id AND user_id = auth.uid()
  );
END;
$$;

-- Check if current user is owner of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_owner(w_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = w_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = w_id AND user_id = auth.uid() AND role = 'owner'
  );
END;
$$;

-- Check if current user can manage workspace members (owner or admin)
CREATE OR REPLACE FUNCTION public.can_manage_workspace_members(w_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = w_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = w_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
END;
$$;

-- Check if current user can access project
CREATE OR REPLACE FUNCTION public.can_access_project(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = p_id AND wm.user_id = auth.uid()
  );
END;
$$;


--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES policies
CREATE POLICY select_profiles ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY update_profiles ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. WORKSPACES policies
CREATE POLICY select_workspaces ON public.workspaces
  FOR SELECT TO authenticated USING (is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY insert_workspaces ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY update_workspaces ON public.workspaces
  FOR UPDATE TO authenticated USING (is_workspace_owner(id));

CREATE POLICY delete_workspaces ON public.workspaces
  FOR DELETE TO authenticated USING (is_workspace_owner(id));

-- 3. WORKSPACE_MEMBERS policies
CREATE POLICY select_workspace_members ON public.workspace_members
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

CREATE POLICY insert_workspace_members ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (can_manage_workspace_members(workspace_id));

CREATE POLICY update_workspace_members ON public.workspace_members
  FOR UPDATE TO authenticated USING (can_manage_workspace_members(workspace_id));

CREATE POLICY delete_workspace_members ON public.workspace_members
  FOR DELETE TO authenticated USING (can_manage_workspace_members(workspace_id));

-- 4. PROJECTS policies
CREATE POLICY select_projects ON public.projects
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));

CREATE POLICY insert_projects ON public.projects
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id) AND auth.uid() = created_by);

CREATE POLICY update_projects ON public.projects
  FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id));

CREATE POLICY delete_projects ON public.projects
  FOR DELETE TO authenticated USING (is_workspace_member(workspace_id));

-- 5. TASKS policies
CREATE POLICY select_tasks ON public.tasks
  FOR SELECT TO authenticated USING (can_access_project(project_id));

CREATE POLICY insert_tasks ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (can_access_project(project_id) AND auth.uid() = created_by);

CREATE POLICY update_tasks ON public.tasks
  FOR UPDATE TO authenticated USING (can_access_project(project_id));

CREATE POLICY delete_tasks ON public.tasks
  FOR DELETE TO authenticated USING (can_access_project(project_id));
