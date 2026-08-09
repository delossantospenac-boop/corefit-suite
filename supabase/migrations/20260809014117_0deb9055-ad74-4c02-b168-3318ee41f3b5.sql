ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS access_note text,
  ADD COLUMN IF NOT EXISTS unit_weight text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS unit_length text NOT NULL DEFAULT 'cm',
  ADD COLUMN IF NOT EXISTS unit_distance text NOT NULL DEFAULT 'km';

ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'no_asistio';

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS class_type text;

DROP POLICY IF EXISTS appointments_client_update ON public.appointments;
CREATE POLICY appointments_client_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = appointments.client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = appointments.client_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
CREATE POLICY user_roles_admin_manage ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;