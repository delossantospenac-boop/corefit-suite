-- ENUMS
CREATE TYPE public.routine_status AS ENUM ('activa','programada','finalizada','pausada','archivada');
CREATE TYPE public.routine_goal AS ENUM ('hipertrofia','perdida_grasa','fuerza','resistencia','recomposicion','acondicionamiento','personalizado');
CREATE TYPE public.routine_level AS ENUM ('principiante','intermedio','avanzado');
CREATE TYPE public.set_type AS ENUM ('normal','calentamiento','drop_set','superserie','triserie','descendente','amrap','emom','isometrico','circuito');
CREATE TYPE public.session_status AS ENUM ('en_curso','completada','abandonada');

-- WORKOUT_TEMPLATES (rutinas)
ALTER TABLE public.workout_templates
  ADD COLUMN goal public.routine_goal,
  ADD COLUMN level public.routine_level,
  ADD COLUMN status public.routine_status NOT NULL DEFAULT 'activa',
  ADD COLUMN start_date date,
  ADD COLUMN end_date date,
  ADD COLUMN days_per_week integer NOT NULL DEFAULT 3,
  ADD COLUMN suggested_time time,
  ADD COLUMN notes text,
  ADD COLUMN phase integer NOT NULL DEFAULT 1,
  ADD COLUMN parent_routine_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  ADD COLUMN source_template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- WORKOUT_DAYS
ALTER TABLE public.workout_days
  ADD COLUMN description text,
  ADD COLUMN estimated_min integer,
  ADD COLUMN weekday integer;

-- WORKOUT_EXERCISES
ALTER TABLE public.workout_exercises
  ADD COLUMN set_type public.set_type NOT NULL DEFAULT 'normal',
  ADD COLUMN group_label text,
  ADD COLUMN tips text;

-- EXERCISES
ALTER TABLE public.exercises
  ADD COLUMN secondary_muscles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exercise_type text,
  ADD COLUMN tips text;

-- WORKOUT_LOGS
ALTER TABLE public.workout_logs
  ADD COLUMN total_sets integer NOT NULL DEFAULT 0,
  ADD COLUMN total_reps integer NOT NULL DEFAULT 0,
  ADD COLUMN prs_count integer NOT NULL DEFAULT 0,
  ADD COLUMN calories numeric;

-- HELPER: template that owns a workout_exercise row
CREATE OR REPLACE FUNCTION public.template_of_workout_exercise(_we_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.template_id
  FROM public.workout_exercises we
  JOIN public.workout_days d ON d.id = we.day_id
  WHERE we.id = _we_id;
$$;

-- EXERCISE CATEGORIES
CREATE TABLE public.exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  slug text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, slug)
);
GRANT SELECT ON public.exercise_categories TO authenticated;
GRANT SELECT ON public.exercise_categories TO anon;
GRANT ALL ON public.exercise_categories TO service_role;
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.exercise_categories FOR SELECT USING (true);

-- WORKOUT SETS (series planificadas)
CREATE TABLE public.workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  set_type public.set_type NOT NULL DEFAULT 'normal',
  reps text,
  weight numeric,
  time_seconds integer,
  distance_m numeric,
  rest_seconds integer,
  rir numeric,
  rpe numeric,
  tempo text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sets viewable" ON public.workout_sets FOR SELECT TO authenticated
  USING (public.can_view_template(public.template_of_workout_exercise(workout_exercise_id)));
CREATE POLICY "sets manageable" ON public.workout_sets FOR ALL TO authenticated
  USING (public.can_manage_template(public.template_of_workout_exercise(workout_exercise_id)))
  WITH CHECK (public.can_manage_template(public.template_of_workout_exercise(workout_exercise_id)));
CREATE INDEX workout_sets_we_idx ON public.workout_sets(workout_exercise_id);

-- WORKOUT SESSIONS (entrenamiento en curso)
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  day_id uuid REFERENCES public.workout_days(id) ON DELETE SET NULL,
  log_id uuid REFERENCES public.workout_logs(id) ON DELETE SET NULL,
  status public.session_status NOT NULL DEFAULT 'en_curso',
  current_index integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions viewable" ON public.workout_sessions FOR SELECT TO authenticated
  USING (public.can_view_client(client_id));
CREATE POLICY "sessions manageable" ON public.workout_sessions FOR ALL TO authenticated
  USING (public.can_view_client(client_id)) WITH CHECK (public.can_view_client(client_id));
CREATE TRIGGER t_sessions_updated BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX workout_sessions_client_idx ON public.workout_sessions(client_id, status);

-- WORKOUT NOTES
CREATE TABLE public.workout_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  day_id uuid REFERENCES public.workout_days(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_notes TO authenticated;
GRANT ALL ON public.workout_notes TO service_role;
ALTER TABLE public.workout_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes viewable" ON public.workout_notes FOR SELECT TO authenticated
  USING (author_id = auth.uid()
         OR (client_id IS NOT NULL AND public.can_view_client(client_id))
         OR (template_id IS NOT NULL AND public.can_view_template(template_id)));
CREATE POLICY "notes insertable" ON public.workout_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes editable" ON public.workout_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "notes deletable" ON public.workout_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_super_admin());

-- SEED: categorias y equipos
INSERT INTO public.exercise_categories (kind, slug, label, sort_order) VALUES
  ('muscle','pecho','Pecho',1),
  ('muscle','espalda','Espalda',2),
  ('muscle','hombros','Hombros',3),
  ('muscle','biceps','Bíceps',4),
  ('muscle','triceps','Tríceps',5),
  ('muscle','cuadriceps','Cuádriceps',6),
  ('muscle','femorales','Femorales',7),
  ('muscle','gluteos','Glúteos',8),
  ('muscle','pantorrillas','Pantorrillas',9),
  ('muscle','abdominales','Abdominales',10),
  ('muscle','cardio','Cardio',11),
  ('muscle','cuerpo_completo','Cuerpo completo',12),
  ('muscle','movilidad','Movilidad',13),
  ('equipment','barra','Barra',1),
  ('equipment','mancuernas','Mancuernas',2),
  ('equipment','polea','Polea',3),
  ('equipment','maquina','Máquina',4),
  ('equipment','banda','Banda',5),
  ('equipment','peso_corporal','Peso corporal',6),
  ('equipment','kettlebell','Kettlebell',7),
  ('equipment','otros','Otros',8);

-- SEED: biblioteca base de ejercicios globales
INSERT INTO public.exercises (trainer_id, name, muscle_group, equipment, difficulty, exercise_type, secondary_muscles, description, instructions, common_mistakes, tips, variations) VALUES
  (NULL,'Press banca con barra','pecho','barra','intermedio','fuerza','{triceps,hombros}','Ejercicio básico de empuje horizontal para pecho.','Acuéstate en el banco, baja la barra al pecho controlando y empuja hasta extender los codos.','Rebotar la barra en el pecho; despegar los glúteos del banco.','Mantén las escápulas retraídas y los pies firmes en el suelo.','Press inclinado, press con mancuernas'),
  (NULL,'Press inclinado con mancuernas','pecho','mancuernas','intermedio','fuerza','{hombros,triceps}','Empuje inclinado que enfatiza la porción superior del pecho.','Con el banco a 30-45°, baja las mancuernas a los lados del pecho y empuja arriba.','Inclinación excesiva del banco; recorrido corto.','Controla la bajada 2-3 segundos.','Press inclinado con barra'),
  (NULL,'Aperturas en polea','pecho','polea','principiante','hipertrofia','{hombros}','Aislamiento de pecho con tensión constante.','De pie entre poleas, junta las manos al frente describiendo un arco.','Flexionar demasiado los codos; usar impulso.','Aprieta el pecho 1 segundo en el cierre.','Aperturas en banco con mancuernas'),
  (NULL,'Dominadas','espalda','peso_corporal','avanzado','fuerza','{biceps,hombros}','Tracción vertical fundamental para dorsales.','Cuélgate con agarre prono y tira hasta que el mentón supere la barra.','Balanceo del cuerpo; rango incompleto.','Inicia el movimiento deprimiendo las escápulas.','Dominadas supinas, asistidas con banda'),
  (NULL,'Remo con barra','espalda','barra','intermedio','fuerza','{biceps,femorales}','Tracción horizontal para densidad de espalda.','Con torso inclinado 45°, lleva la barra al abdomen y controla la bajada.','Redondear la espalda; usar impulso de cadera.','Mantén el core firme y el cuello neutro.','Remo Pendlay, remo con mancuerna'),
  (NULL,'Jalón al pecho','espalda','polea','principiante','hipertrofia','{biceps}','Alternativa a dominadas con carga regulable.','Sentado, tira de la barra al pecho manteniendo el torso estable.','Echar el torso muy atrás; tirar con los brazos.','Piensa en llevar los codos a los bolsillos.','Jalón agarre neutro'),
  (NULL,'Press militar de pie','hombros','barra','intermedio','fuerza','{triceps,abdominales}','Empuje vertical para hombros y estabilidad del core.','De pie, empuja la barra desde la clavícula hasta arriba de la cabeza.','Arquear la lumbar; no bloquear el core.','Aprieta glúteos y abdomen durante todo el recorrido.','Press con mancuernas, press Arnold'),
  (NULL,'Elevaciones laterales','hombros','mancuernas','principiante','hipertrofia','{}','Aislamiento del deltoides medio.','Eleva las mancuernas a los lados hasta la altura de los hombros.','Usar impulso; subir por encima del hombro con trapecio.','Codos ligeramente flexionados y muñecas neutras.','Elevaciones en polea'),
  (NULL,'Curl con barra','biceps','barra','principiante','hipertrofia','{}','Ejercicio clásico para bíceps.','Con codos pegados al torso, flexiona hasta arriba y baja controlando.','Balancear el torso; abrir los codos.','Baja en 3 segundos para más tensión.','Curl con mancuernas, curl martillo'),
  (NULL,'Curl martillo','biceps','mancuernas','principiante','hipertrofia','{}','Trabaja bíceps y braquial con agarre neutro.','Con agarre neutro, flexiona los codos alternando o a la vez.','Rotar las muñecas; usar impulso.','Mantén el agarre neutro todo el rango.','Curl en banco inclinado'),
  (NULL,'Fondos en paralelas','triceps','peso_corporal','intermedio','fuerza','{pecho,hombros}','Empuje vertical para tríceps y pecho.','Baja el cuerpo con torso vertical y empuja hasta extender los codos.','Bajar demasiado con hombros abiertos.','Mantén el torso vertical para enfatizar tríceps.','Fondos en banco'),
  (NULL,'Extensión de tríceps en polea','triceps','polea','principiante','hipertrofia','{}','Aislamiento del tríceps con tensión constante.','Con codos fijos, extiende los brazos hacia abajo.','Mover los codos; usar el peso del cuerpo.','Bloquea los codos al costado del torso.','Extensión con cuerda, patada de tríceps'),
  (NULL,'Sentadilla con barra','cuadriceps','barra','avanzado','fuerza','{gluteos,femorales}','Ejercicio base de tren inferior.','Con la barra en la espalda alta, baja hasta al menos paralelo y sube.','Valgo de rodillas; talones despegados.','Respira profundo y mantén el core presurizado.','Sentadilla frontal, sentadilla Búlgara'),
  (NULL,'Prensa de piernas','cuadriceps','maquina','principiante','hipertrofia','{gluteos}','Empuje de piernas con alta estabilidad.','Empuja la plataforma sin bloquear las rodillas al final.','Despegar la lumbar; rango muy corto.','Pies a la anchura de los hombros.','Prensa horizontal'),
  (NULL,'Peso muerto rumano','femorales','barra','intermedio','fuerza','{gluteos,espalda}','Bisagra de cadera para femorales y glúteos.','Con rodillas semiflexionadas, baja la barra pegada a las piernas.','Redondear la espalda; convertirlo en sentadilla.','Empuja la cadera atrás y siente el estiramiento.','Peso muerto con mancuernas'),
  (NULL,'Curl femoral en máquina','femorales','maquina','principiante','hipertrofia','{pantorrillas}','Aislamiento de isquiotibiales.','Flexiona las rodillas llevando el talón al glúteo.','Despegar la cadera; usar impulso.','Pausa 1 segundo en la máxima contracción.','Curl femoral sentado'),
  (NULL,'Hip thrust','gluteos','barra','intermedio','hipertrofia','{femorales}','Ejercicio principal para glúteo mayor.','Con la espalda apoyada en el banco, eleva la cadera hasta la extensión completa.','Hiperextender la lumbar; barra mal colocada.','Termina apretando glúteos 1 segundo.','Puente de glúteo, hip thrust en máquina'),
  (NULL,'Zancadas caminando','gluteos','mancuernas','intermedio','hipertrofia','{cuadriceps,femorales}','Trabajo unilateral de tren inferior.','Avanza con pasos largos bajando la rodilla trasera cerca del suelo.','Pasos cortos; rodilla adelantada al pie.','Mantén el torso erguido y el paso controlado.','Zancadas estáticas, Búlgaras'),
  (NULL,'Elevación de talones','pantorrillas','maquina','principiante','hipertrofia','{}','Aislamiento de gemelos.','Eleva los talones al máximo y baja estirando.','Rebotar sin control.','Pausa arriba y abajo 1 segundo.','De pie, sentado'),
  (NULL,'Plancha abdominal','abdominales','peso_corporal','principiante','isometrico','{cuerpo_completo}','Isométrico de core.','Apoya antebrazos y puntas de pies manteniendo el cuerpo alineado.','Elevar la cadera; hundir la lumbar.','Aprieta glúteos y abdomen todo el tiempo.','Plancha lateral, plancha con peso'),
  (NULL,'Crunch en polea','abdominales','polea','principiante','hipertrofia','{}','Flexión de tronco con carga.','De rodillas, flexiona el tronco acercando codos a las rodillas.','Tirar con los brazos; no redondear el tronco.','Exhala al contraer.','Crunch en máquina'),
  (NULL,'Carrera en cinta','cardio','maquina','principiante','cardio','{cuerpo_completo}','Trabajo cardiovascular continuo o por intervalos.','Ajusta velocidad e inclinación según el objetivo.','Agarrarse de los pasamanos; zancada excesiva.','Mantén cadencia alta y pisada suave.','Intervalos HIIT, caminata inclinada'),
  (NULL,'Remo en máquina de remo','cardio','maquina','intermedio','cardio','{espalda,cuadriceps}','Cardio de cuerpo completo de bajo impacto.','Empuja con las piernas, luego tira con la espalda y los brazos.','Tirar primero con los brazos.','Secuencia piernas-cadera-brazos.','Intervalos de 500 m'),
  (NULL,'Burpees','cuerpo_completo','peso_corporal','intermedio','acondicionamiento','{pecho,cuadriceps}','Ejercicio metabólico de cuerpo completo.','Baja a plancha, haz una flexión, salta y termina con salto vertical.','Perder la alineación del core al caer.','Prioriza ritmo constante sobre velocidad máxima.','Burpee sin flexión'),
  (NULL,'Swing con kettlebell','cuerpo_completo','kettlebell','intermedio','acondicionamiento','{gluteos,femorales,espalda}','Bisagra explosiva de cadera.','Proyecta la kettlebell con la cadera hasta la altura del pecho.','Convertirlo en sentadilla; levantar con los brazos.','La potencia viene de la cadera, no de los hombros.','Swing americano'),
  (NULL,'Movilidad de cadera 90/90','movilidad','peso_corporal','principiante','movilidad','{gluteos}','Movilidad de rotación de cadera.','Sentado con piernas en 90/90, rota de un lado al otro con control.','Compensar con la lumbar.','Respira y avanza rango progresivamente.','90/90 con apoyo de manos'),
  (NULL,'Movilidad torácica con banda','movilidad','banda','principiante','movilidad','{espalda,hombros}','Movilidad de hombro y columna torácica.','Con la banda, realiza pasadas por encima de la cabeza con brazos extendidos.','Arquear la lumbar para ganar rango.','Mantén las costillas abajo.','Dislocaciones con palo');