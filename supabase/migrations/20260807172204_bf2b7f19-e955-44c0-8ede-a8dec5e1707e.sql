
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','gym_admin','trainer','client');
CREATE TYPE public.client_status AS ENUM ('activo','inactivo','pausado','finalizado');
CREATE TYPE public.payment_status AS ENUM ('activo','pendiente','vencido','cancelado');
CREATE TYPE public.checkin_status AS ENUM ('pendiente','completado','revisado');
CREATE TYPE public.appointment_status AS ENUM ('programada','confirmada','cancelada','completada');
CREATE TYPE public.photo_category AS ENUM ('frente','espalda','perfil_izquierdo','perfil_derecho','personalizada');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES / ROLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  gym_id UUID,
  brand_name TEXT,
  brand_color TEXT,
  brand_logo_url TEXT,
  bio TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  logo_url TEXT,
  city TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT ALL ON public.gyms TO service_role;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gym_fk FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE SET NULL;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gym_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_gym_admin_of(_gym_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _gym_id IS NOT NULL
     AND public.has_role(auth.uid(), 'gym_admin')
     AND _gym_id = (SELECT gym_id FROM public.profiles WHERE id = auth.uid());
$$;

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  birth_date DATE,
  sex TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  goal TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.client_status NOT NULL DEFAULT 'activo',
  archived BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_trainer ON public.clients(trainer_id);
CREATE INDEX idx_clients_user ON public.clients(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_client(_client_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id
      AND (c.trainer_id = auth.uid() OR public.is_super_admin() OR public.is_gym_admin_of(c.gym_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_client(_client_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id
      AND (c.trainer_id = auth.uid() OR c.user_id = auth.uid()
           OR public.is_super_admin() OR public.is_gym_admin_of(c.gym_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_of_user(_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE (c.trainer_id = _profile_id AND c.user_id = auth.uid())
       OR (c.user_id = _profile_id AND c.trainer_id = auth.uid())
  );
$$;

-- profiles policies
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin() OR public.is_gym_admin_of(gym_id) OR public.is_trainer_of_user(id));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin()) WITH CHECK (id = auth.uid() OR public.is_super_admin());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "gyms_select" ON public.gyms FOR SELECT TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid() OR id = public.current_gym_id());
CREATE POLICY "gyms_manage" ON public.gyms FOR ALL TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR owner_id = auth.uid());

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated
  USING (trainer_id = auth.uid() OR user_id = auth.uid() OR public.is_super_admin() OR public.is_gym_admin_of(gym_id));
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid() OR public.is_super_admin() OR public.is_gym_admin_of(gym_id));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin() OR public.is_gym_admin_of(gym_id))
  WITH CHECK (trainer_id = auth.uid() OR public.is_super_admin() OR public.is_gym_admin_of(gym_id));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin());

-- ============ SAAS PLANS ============
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price NUMERIC,
  annual_price NUMERIC,
  max_clients INTEGER,
  max_trainers INTEGER NOT NULL DEFAULT 1,
  storage_gb INTEGER NOT NULL DEFAULT 1,
  has_nutrition BOOLEAN NOT NULL DEFAULT false,
  has_reports BOOLEAN NOT NULL DEFAULT false,
  has_ai BOOLEAN NOT NULL DEFAULT false,
  has_white_label BOOLEAN NOT NULL DEFAULT false,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_select_all" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_manage_admin" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.subscription_plans (name, slug, description, max_clients, max_trainers, storage_gb, has_nutrition, has_reports, has_ai, has_white_label, sort_order, features)
VALUES
 ('Básico','basico','Para empezar a gestionar tus primeros clientes.',15,1,2,false,true,false,false,1,'["Gestión de clientes","Rutinas ilimitadas","Progreso y evaluaciones"]'::jsonb),
 ('Pro','pro','Para entrenadores profesionales en crecimiento.',75,1,20,true,true,true,false,2,'["Todo lo del plan Básico","Nutrición","Asistente IA","Reportes PDF"]'::jsonb),
 ('Studio','studio','Para estudios y gimnasios con varios entrenadores.',NULL,10,200,true,true,true,true,3,'["Todo lo del plan Pro","Clientes ilimitados","Multi-entrenador","Marca blanca"]'::jsonb);

CREATE TABLE public.trainer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status public.payment_status NOT NULL DEFAULT 'activo',
  billing_cycle TEXT NOT NULL DEFAULT 'mensual',
  price NUMERIC,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainer_subscriptions TO authenticated;
GRANT ALL ON public.trainer_subscriptions TO service_role;
ALTER TABLE public.trainer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select" ON public.trainer_subscriptions FOR SELECT TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "subs_manage" ON public.trainer_subscriptions FOR ALL TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (trainer_id = auth.uid() OR public.is_super_admin());

-- ============ ASSESSMENTS / PHOTOS ============
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC, height_cm NUMERIC, bmi NUMERIC,
  body_fat_pct NUMERIC, fat_mass NUMERIC, muscle_mass NUMERIC,
  waist_cm NUMERIC, hip_cm NUMERIC, chest_cm NUMERIC,
  arm_cm NUMERIC, thigh_cm NUMERIC, calf_cm NUMERIC,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessments_client ON public.assessments(client_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments_select" ON public.assessments FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "assessments_manage" ON public.assessments FOR ALL TO authenticated
  USING (public.can_manage_client(client_id)) WITH CHECK (public.can_manage_client(client_id));

CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category public.photo_category NOT NULL DEFAULT 'frente',
  url TEXT NOT NULL,
  taken_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_select" ON public.progress_photos FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "photos_manage" ON public.progress_photos FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));

-- ============ EXERCISES / WORKOUTS ============
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT,
  equipment TEXT,
  difficulty TEXT,
  image_url TEXT,
  video_url TEXT,
  description TEXT,
  instructions TEXT,
  common_mistakes TEXT,
  variations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_select" ON public.exercises FOR SELECT TO authenticated
  USING (trainer_id IS NULL OR trainer_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "exercises_manage" ON public.exercises FOR ALL TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (trainer_id = auth.uid() OR public.is_super_admin());

CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weeks INTEGER NOT NULL DEFAULT 4,
  is_template BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select" ON public.workout_templates FOR SELECT TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin() OR (client_id IS NOT NULL AND public.can_view_client(client_id)));
CREATE POLICY "templates_manage" ON public.workout_templates FOR ALL TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (trainer_id = auth.uid() OR public.is_super_admin());

CREATE OR REPLACE FUNCTION public.can_view_template(_template_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = _template_id
      AND (t.trainer_id = auth.uid() OR public.is_super_admin()
           OR (t.client_id IS NOT NULL AND public.can_view_client(t.client_id)))
  );
$$;
CREATE OR REPLACE FUNCTION public.can_manage_template(_template_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = _template_id AND (t.trainer_id = auth.uid() OR public.is_super_admin())
  );
$$;

CREATE TABLE public.workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_days TO authenticated;
GRANT ALL ON public.workout_days TO service_role;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "days_select" ON public.workout_days FOR SELECT TO authenticated USING (public.can_view_template(template_id));
CREATE POLICY "days_manage" ON public.workout_days FOR ALL TO authenticated
  USING (public.can_manage_template(template_id)) WITH CHECK (public.can_manage_template(template_id));

CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 1,
  block TEXT,
  sets INTEGER,
  reps TEXT,
  weight NUMERIC,
  time_seconds INTEGER,
  distance_m NUMERIC,
  rest_seconds INTEGER,
  tempo TEXT,
  rir NUMERIC,
  rpe NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;
GRANT ALL ON public.workout_exercises TO service_role;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.template_of_day(_day_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT template_id FROM public.workout_days WHERE id = _day_id;
$$;
CREATE POLICY "wex_select" ON public.workout_exercises FOR SELECT TO authenticated
  USING (public.can_view_template(public.template_of_day(day_id)));
CREATE POLICY "wex_manage" ON public.workout_exercises FOR ALL TO authenticated
  USING (public.can_manage_template(public.template_of_day(day_id)))
  WITH CHECK (public.can_manage_template(public.template_of_day(day_id)));

CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  day_id UUID REFERENCES public.workout_days(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_min INTEGER,
  total_volume NUMERIC,
  status TEXT NOT NULL DEFAULT 'completado',
  feeling INTEGER,
  pain TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logs_client ON public.workout_logs(client_id, performed_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;
GRANT ALL ON public.workout_logs TO service_role;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_all" ON public.workout_logs FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));

CREATE TABLE public.workout_log_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  weight NUMERIC,
  reps INTEGER,
  rir NUMERIC,
  rpe NUMERIC,
  completed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sets_client_ex ON public.workout_log_sets(client_id, exercise_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_log_sets TO authenticated;
GRANT ALL ON public.workout_log_sets TO service_role;
ALTER TABLE public.workout_log_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sets_all" ON public.workout_log_sets FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));

CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL DEFAULT '1rm',
  value NUMERIC NOT NULL,
  weight NUMERIC,
  reps INTEGER,
  achieved_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO service_role;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_all" ON public.personal_records FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));

-- ============ NUTRITION ============
CREATE TABLE public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  portion TEXT NOT NULL DEFAULT '100 g',
  substitutions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foods TO authenticated;
GRANT ALL ON public.foods TO service_role;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foods_select" ON public.foods FOR SELECT TO authenticated
  USING (trainer_id IS NULL OR trainer_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "foods_manage" ON public.foods FOR ALL TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (trainer_id = auth.uid() OR public.is_super_admin());

CREATE TABLE public.nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Plan nutricional',
  calories NUMERIC, protein NUMERIC, carbs NUMERIC, fat NUMERIC, water_ml NUMERIC,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.nutrition_plans TO service_role;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrition_select" ON public.nutrition_plans FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "nutrition_manage" ON public.nutrition_plans FOR ALL TO authenticated
  USING (public.can_manage_client(client_id)) WITH CHECK (public.can_manage_client(client_id));

CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL DEFAULT 'desayuno',
  name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  calories NUMERIC, protein NUMERIC, carbs NUMERIC, fat NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT ALL ON public.meals TO service_role;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meals_select" ON public.meals FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "meals_manage" ON public.meals FOR ALL TO authenticated
  USING (public.can_manage_client(client_id)) WITH CHECK (public.can_manage_client(client_id));

-- ============ HABITS ============
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💧',
  target NUMERIC,
  unit TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_select" ON public.habits FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "habits_manage" ON public.habits FOR ALL TO authenticated
  USING (public.can_manage_client(client_id)) WITH CHECK (public.can_manage_client(client_id));

CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_logs TO service_role;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_logs_all" ON public.habit_logs FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));

-- ============ CHECK-INS ============
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::date,
  status public.checkin_status NOT NULL DEFAULT 'pendiente',
  energy INTEGER, sleep INTEGER, stress INTEGER, hunger INTEGER, motivation INTEGER,
  workouts_done INTEGER, nutrition_compliance INTEGER,
  pain TEXT, weight_kg NUMERIC, comments TEXT,
  trainer_feedback TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_all" ON public.check_ins FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));

-- ============ CHAT ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_client ON public.messages(client_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_view_client(client_id));
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ AGENDA ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sesión de entrenamiento',
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  status public.appointment_status NOT NULL DEFAULT 'programada',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_select" ON public.appointments FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "appointments_manage" ON public.appointments FOR ALL TO authenticated
  USING (public.can_manage_client(client_id)) WITH CHECK (public.can_manage_client(client_id));

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Mensualidad',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT,
  status public.payment_status NOT NULL DEFAULT 'pendiente',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_payment_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "payments_manage" ON public.payments FOR ALL TO authenticated
  USING (public.can_manage_client(client_id)) WITH CHECK (public.can_manage_client(client_id));

-- ============ ACHIEVEMENTS ============
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'entrenamientos',
  threshold NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select" ON public.achievements FOR SELECT TO authenticated USING (true);

INSERT INTO public.achievements (code, name, icon, description, kind, threshold) VALUES
 ('first_workout','Primer entrenamiento','🏆','Completaste tu primer entrenamiento','entrenamientos',1),
 ('workouts_10','10 entrenamientos','🏆','10 entrenamientos completados','entrenamientos',10),
 ('workouts_50','50 entrenamientos','🏆','50 entrenamientos completados','entrenamientos',50),
 ('workouts_100','100 entrenamientos','🏆','100 entrenamientos completados','entrenamientos',100),
 ('first_pr','Primer PR','🏆','Conseguiste tu primer récord personal','pr',1),
 ('streak_30','30 días consecutivos','🏆','30 días seguidos cumpliendo tus hábitos','racha',30),
 ('lose_5kg','-5 kg','🏆','Perdiste 5 kg desde tu inicio','peso',5),
 ('lose_10cm','-10 cm','🏆','Redujiste 10 cm de cintura','medidas',10);

CREATE TABLE public.client_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, achievement_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_achievements TO authenticated;
GRANT ALL ON public.client_achievements TO service_role;
ALTER TABLE public.client_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_achievements_all" ON public.client_achievements FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));

-- ============ NOTIFICATIONS / REPORTS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  trainer_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select" ON public.reports FOR SELECT TO authenticated USING (public.can_view_client(client_id));
CREATE POLICY "reports_manage" ON public.reports FOR ALL TO authenticated
  USING (public.can_manage_client(client_id)) WITH CHECK (public.can_manage_client(client_id));

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          NEW.email,
          NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'trainer');
  IF _role = 'super_admin' THEN _role := 'trainer'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  IF _role = 'client' THEN
    UPDATE public.clients SET user_id = NEW.id
    WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_templates_updated BEFORE UPDATE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_subs_updated BEFORE UPDATE ON public.trainer_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_nutrition_updated BEFORE UPDATE ON public.nutrition_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_plans_updated BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_gyms_updated BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_exercises_updated BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
