-- 1) Super admin permanente
INSERT INTO public.user_roles (user_id, role)
VALUES ('a37dcfd1-a007-4b7c-9be6-56ebdf84b433', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          NEW.email,
          NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'delossantospenac@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'trainer');
  IF _role = 'super_admin' THEN _role := 'trainer'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  IF _role = 'client' THEN
    UPDATE public.clients SET user_id = NEW.id
    WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END; $function$;

-- 2) Clases enriquecidas
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS day_id uuid REFERENCES public.workout_days(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_note text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attended boolean,
  ADD COLUMN IF NOT EXISTS actual_duration_min integer,
  ADD COLUMN IF NOT EXISTS counts_against_package boolean NOT NULL DEFAULT true;

-- 3) Paquete de clases contratadas
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS classes_purchased integer NOT NULL DEFAULT 0;

-- 4) Pagos de membresía de la plataforma
CREATE TABLE IF NOT EXISTS public.membership_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.trainer_subscriptions(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  period_start date NOT NULL DEFAULT CURRENT_DATE,
  period_end date,
  method text,
  provider text,
  provider_ref text,
  status public.payment_status NOT NULL DEFAULT 'activo',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_payments TO authenticated;
GRANT ALL ON public.membership_payments TO service_role;

ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_payments_select" ON public.membership_payments
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "membership_payments_admin_manage" ON public.membership_payments
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER t_membership_payments_updated
  BEFORE UPDATE ON public.membership_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_membership_payments_trainer ON public.membership_payments(trainer_id, period_start DESC);

-- 5) Acceso del entrenador según suscripción vigente
CREATE OR REPLACE FUNCTION public.trainer_access_ok(_trainer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT p.access_enabled FROM public.profiles p WHERE p.id = _trainer_id), false)
     AND EXISTS (
       SELECT 1 FROM public.trainer_subscriptions s
       WHERE s.trainer_id = _trainer_id
         AND s.status = 'activo'
         AND (s.next_billing_at IS NULL OR s.next_billing_at >= CURRENT_DATE)
     );
$function$;
