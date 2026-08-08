# Módulo de Rutinas y Entrenamientos — Plan de implementación

Módulo nuevo, integrado sobre la estructura actual. No se rehace nada: se amplían las tablas de entrenamiento que ya existen y se añaden rutas nuevas.

## Punto de partida (verificado en el proyecto)

Ya existen y se reutilizan: `exercises`, `workout_templates`, `workout_days`, `workout_exercises`, `workout_logs`, `workout_log_sets`, `personal_records`, con RLS y funciones `can_view_client` / `can_manage_client` / `can_view_template` / `can_manage_template` / `is_super_admin`.

Faltan campos y tablas: objetivo/nivel/fechas/estado en rutinas, tipos de serie y agrupaciones (A1/A2), músculos secundarios y consejos en ejercicios, sesiones en curso, notas de rutina y cumplimiento.

No hace falta configurar nada nuevo de backend: la base de datos y la autenticación ya están activas.

## Fase 1 — Base de datos (una migración)

Ampliar sin borrar datos:
- `workout_templates`: objetivo, nivel, fecha inicio/fin, estado (activa, programada, finalizada, pausada, archivada), días por semana, hora sugerida, notas, fase y rutina padre (para encadenar Fase 1 → 2 → 3), plantilla de origen.
- `workout_days`: descripción, duración estimada, día de la semana.
- `workout_exercises`: tipo de serie (normal, calentamiento, drop set, superserie, triserie, descendente, AMRAP, EMOM, isométrico, circuito), etiqueta de grupo (A1/A2…), consejos.
- `exercises`: músculos secundarios, tipo, consejos.
- `workout_logs`: sensación, comentario, resumen (volumen, duración, PRs), rutina y día vinculados.

Tablas nuevas:
- `exercise_categories` (catálogo de grupos musculares y equipos).
- `workout_sets` (series planificadas por ejercicio: número, reps, peso objetivo, tiempo, distancia, descanso, RIR, RPE, tempo, tipo).
- `workout_sessions` (entrenamiento en curso: inicio, ejercicio/serie actual, estado, para poder retomar desde el móvil).
- `workout_notes` (notas del entrenador o del cliente sobre rutina/día/ejercicio).

Cada tabla nueva con GRANT, RLS y políticas basadas en las funciones existentes: entrenador solo sus clientes, cliente solo lo suyo, super admin todo.

Datos iniciales: catálogo de categorías y equipos, y un set base de ejercicios globales con grupo muscular e instrucciones.

## Fase 2 — Capa de datos y tipos

- `src/lib/rutinas.ts`: tipos, catálogos (objetivos, niveles, tipos de serie, grupos musculares, equipos), consultas y mutaciones (crear/duplicar rutina, duplicar día/ejercicio, guardar como plantilla, usar plantilla creando copia independiente, asignar a cliente, cálculo de cumplimiento, volumen, racha y detección de récords).

## Fase 3 — Entrenador

- `src/routes/app/rutinas.index.tsx`: listado con pestañas Activas / Programadas / Archivadas / Plantillas y filtro por cliente; tarjeta con nombre, cliente, objetivo, días, fechas, estado y % de cumplimiento; botón Crear nueva rutina.
- `src/routes/app/rutinas.$routineId.tsx`: constructor — datos generales, días (agregar, eliminar, duplicar, reordenar), ejercicios por día con selector desde la biblioteca, configuración de series y agrupaciones, guardar como plantilla, duplicar rutina, crear siguiente fase.
- `src/routes/app/ejercicios.tsx`: biblioteca de ejercicios con búsqueda, filtros por grupo/equipo/dificultad, y alta/edición con imagen, video, instrucciones, errores comunes, consejos y variaciones.
- `src/components/fitcore/rutinas/*`: tarjetas de rutina, editor de día, fila de ejercicio, diálogo de series, selector de ejercicios.
- Añadir Rutinas y Ejercicios al menú en `src/routes/app/route.tsx`.
- Ampliar `ClientRoutinesTab`, `WorkoutLogsTab` y `StrengthTab` en `src/components/fitcore/client-tabs.tsx` para mostrar detalle de rutina, historial de sesiones y progreso objetivo vs. último vs. actual.
- Ampliar `src/routes/app/index.tsx`: entrenando hoy, completados/pendientes, inactivos, nuevos PR, adherencia media y alertas.

## Fase 4 — Cliente (móvil)

- `src/routes/cliente/index.tsx`: tarjeta Entrenamiento de hoy (nombre, duración estimada, progreso x/y, botón Comenzar) y calendario semanal con completado / programado / descanso.
- `src/routes/cliente/rutina.tsx`: rutina completa por días con series, pesos, RIR y notas.
- `src/routes/cliente/entrenar.$dayId.tsx`: ejecución ejercicio por ejercicio, registro de peso/reps/RIR/RPE/notas por serie, temporizador de descanso (pausar, +30s, −30s, saltar), historial del ejercicio, aviso de récord con animación neón y resumen final con sensación y comentario.
- `src/routes/cliente/progreso.tsx`: gráficos por ejercicio, % de aumento de fuerza, PRs, cumplimiento y racha.
- Menú del cliente ampliado en `src/routes/cliente/route.tsx`.

## Fase 5 — Notificaciones y cierre

- Insertar notificaciones en la tabla existente: al cliente (rutina lista, racha, nuevo PR, entrenamiento pendiente) y al entrenador (entrenamiento completado, PR logrado); campana ya existente en el shell.
- Rutinas finalizadas: resumen histórico (duración, entrenamientos, cumplimiento, volumen, PRs) y duplicar para nueva fase.
- Revisión final: identidad negro + azul neón + blanco, responsive móvil, y verificación de que los módulos existentes siguen funcionando.

## Notas técnicas

- Todo el acceso a datos por el cliente de navegador con RLS activa; sin funciones de servidor nuevas.
- Reordenar con drag and drop mediante `@dnd-kit` (dependencia nueva) o, si se prefiere no añadir dependencias, con botones subir/bajar.
- Gráficos con Recharts, ya en uso.
- Estados y catálogos como tipos enumerados en base de datos para mantener integridad.
- Cumplimiento y volumen se calculan a partir de registros reales (`workout_logs` / `workout_log_sets`), no valores fijos.
