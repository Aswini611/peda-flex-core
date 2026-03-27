
-- Student game profiles for personalization
CREATE TABLE public.student_game_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE,
  age_stage text NOT NULL DEFAULT 'explorer',
  brain_level text NOT NULL DEFAULT 'reactive',
  brain_xp integer NOT NULL DEFAULT 0,
  student_age integer,
  preferred_subjects text[] DEFAULT '{}',
  total_games_played integer NOT NULL DEFAULT 0,
  total_time_played integer NOT NULL DEFAULT 0,
  avg_accuracy numeric DEFAULT 0,
  last_played_at timestamptz,
  daily_goal integer NOT NULL DEFAULT 3,
  games_today integer NOT NULL DEFAULT 0,
  games_today_date date,
  surprise_reward_available boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Game sessions tracking
CREATE TABLE public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  game_type text NOT NULL,
  game_category text NOT NULL,
  subject text,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  accuracy numeric NOT NULL DEFAULT 0,
  avg_response_time integer NOT NULL DEFAULT 0,
  difficulty_reached integer NOT NULL DEFAULT 0,
  brain_level_at text NOT NULL DEFAULT 'reactive',
  time_used integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.student_game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Student game profiles policies
CREATE POLICY "Students read own game profile" ON public.student_game_profiles FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students insert own game profile" ON public.student_game_profiles FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own game profile" ON public.student_game_profiles FOR UPDATE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers read all game profiles" ON public.student_game_profiles FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IN ('teacher', 'admin'));

-- Game sessions policies
CREATE POLICY "Students read own sessions" ON public.game_sessions FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students insert own sessions" ON public.game_sessions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Teachers read all sessions" ON public.game_sessions FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IN ('teacher', 'admin'));
