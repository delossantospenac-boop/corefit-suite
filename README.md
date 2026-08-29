# Core Fit Hub

Crea desde cero una aplicación web SaaS profesional para entrenadores personales, coaches fitness y gimnasios.

El nombre provisional de la plataforma será FITCORE.

NO quiero una landing page ni un simple prototipo visual. Quiero construir una aplicación funcional, moderna, escalable y preparada para convertirse en un producto SaaS de pago mensual.

La plataforma tendrá tres tipos principales de usuarios:

SUPER ADMIN

ENTRENADOR

CLIENTE

La aplicación debe estar completamente en español.

==================================================




IDENTIDAD VISUAL

Quiero una identidad visual deportiva, tecnológica, premium y moderna.

COLORES PRINCIPALES:

Negro: color principal de fondo y navegación.

Azul neón: color de acento, botones principales, indicadores activos, gráficos destacados y elementos importantes.

Blanco: textos principales, tarjetas claras y elementos de contraste.

La combinación visual debe sentirse como:

NEGRO + AZUL NEÓN + BLANCO

Evitar utilizar una gran cantidad de colores diferentes.

Usar diferentes niveles de opacidad del azul neón para efectos visuales.

El azul neón debe utilizarse estratégicamente para:

Botones principales.

Links activos.

Progreso.

Estadísticas importantes.

Gráficos.

Badges.

Estados positivos.

Elementos interactivos.

Highlights.

Diseño:

Dark mode como experiencia principal.

Bordes sutiles.

Tarjetas modernas.

Esquinas ligeramente redondeadas.

Sombras discretas.

Gradientes muy sutiles.

Microanimaciones.

Transiciones suaves.

Iconografía moderna.

Excelente jerarquía visual.

NO quiero un diseño infantil.
NO quiero demasiados colores.
NO quiero una interfaz genérica.
Debe parecer un producto SaaS premium de fitness.

==================================================




ARQUITECTURA GENERAL

Construir la aplicación pensando desde el principio en escalabilidad y multiusuario.

Cada entrenador debe tener sus propios clientes.

Un entrenador NO puede acceder a los clientes de otro entrenador.

El Super Admin puede administrar toda la plataforma.

Preparar la arquitectura para que posteriormente puedan existir gimnasios con múltiples entrenadores.

Utilizar autenticación segura y control de permisos por rol.

==================================================




PANTALLA DE LOGIN

Crear login moderno con:

Logo FITCORE.

Email.

Contraseña.

Recordarme.

Recuperar contraseña.

Crear cuenta.

Diseño oscuro con detalles en azul neón.

Crear también recuperación de contraseña y estados de error.

==================================================




SUPER ADMIN

Crear un dashboard administrativo completo.

Mostrar:

Entrenadores registrados.

Entrenadores activos.

Entrenadores inactivos.

Clientes totales.

Clientes activos.

Membresías activas.

Membresías vencidas.

Ingresos mensuales.

MRR.

Nuevos entrenadores.

Cancelaciones.

Crecimiento.

Crear gráficos.

Secciones:

Dashboard
Entrenadores
Clientes
Gimnasios
Planes
Suscripciones
Pagos
Reportes
Configuración

El Super Admin puede:

Crear entrenadores.

Editar entrenadores.

Activar/desactivar entrenadores.

Ver sus clientes.

Ver suscripciones.

Cambiar planes.

Gestionar límites.

Crear planes SaaS.

==================================================




SISTEMA DE PLANES

Crear tres planes iniciales:

BÁSICO
PRO
STUDIO

Cada plan debe permitir definir:

Precio mensual.

Precio anual.

Cantidad máxima de clientes.

Almacenamiento.

Funciones disponibles.

Nutrición.

Reportes.

IA.

White Label.

Número de entrenadores.

No fijar precios todavía. Crear una estructura editable desde el Super Admin.

==================================================




DASHBOARD DEL ENTRENADOR

Crear un dashboard premium.

Encabezado:

“Buenos días, [Nombre] 👋”

Mostrar:

CLIENTES ACTIVOS
ENTRENAMIENTOS ESTA SEMANA
ADHERENCIA PROMEDIO
INGRESOS
CHECK-INS PENDIENTES
PAGOS PENDIENTES

Crear sección:

“Clientes que necesitan atención”

Ejemplos:

⚠️ Juan lleva 5 días sin entrenar.
⚠️ María no ha realizado su check-in.
⚠️ Pedro tiene una evaluación pendiente.
⚠️ Ana tiene una membresía próxima a vencer.

Crear sección:

“Próximas sesiones”

Crear sección:

“Últimos récords”

Crear sección:

“Actividad reciente”

==================================================




GESTIÓN DE CLIENTES

Crear módulo completo de clientes.

Permitir:

Crear cliente.

Editar cliente.

Archivar cliente.

Buscar cliente.

Filtrar cliente.

Ordenar clientes.

Ver estado.

Ver progreso.

Cada cliente debe tener:

Foto.

Nombre.

Edad.

Sexo.

Altura.

Peso.

Objetivo.

Fecha de inicio.

Estado.

Entrenador.

Última actividad.

Próxima sesión.

Estados:

ACTIVO
INACTIVO
PAUSADO
FINALIZADO

==================================================




PERFIL 360° DEL CLIENTE

Crear una página extremadamente completa para cada cliente.

Navegación por pestañas:

RESUMEN
EVALUACIONES
PROGRESO
MEDIDAS
FOTOS
RUTINAS
ENTRENAMIENTOS
FUERZA
NUTRICIÓN
HÁBITOS
CHECK-INS
CHAT
AGENDA
PAGOS
REPORTES

==================================================




EVALUACIONES

Crear evaluaciones físicas.

Campos:

Peso.

Altura.

IMC.

Porcentaje de grasa.

Masa grasa.

Masa muscular.

Cintura.

Cadera.

Pecho.

Brazo.

Muslo.

Pantorrilla.

Otros campos personalizados.

Cada nueva evaluación debe conservarse.

Crear gráficos de evolución.

==================================================




FOTOS DE PROGRESO

Crear sistema de fotografías.

Categorías:

FRENTE
ESPALDA
PERFIL IZQUIERDO
PERFIL DERECHO
PERSONALIZADA

Permitir subir fotografías con fecha.

Crear comparador:

ANTES ←→ DESPUÉS

Crear slider interactivo.

Mostrar evolución por fechas.

==================================================




SISTEMA DE RUTINAS

Crear un constructor profesional de entrenamientos.

Biblioteca de ejercicios.

Cada ejercicio debe contener:

Nombre.

Grupo muscular.

Equipo.

Dificultad.

Imagen.

Video.

Descripción.

Instrucciones.

Errores comunes.

Variaciones.

Cada ejercicio dentro de una rutina debe permitir:

Series.

Repeticiones.

Peso.

Tiempo.

Distancia.

Descanso.

Tempo.

RIR.

RPE.

Notas.

Crear:

Rutinas.

Plantillas.

Bloques.

Días de entrenamiento.

Permitir duplicar y editar rutinas.

==================================================




ENTRENAMIENTO DEL CLIENTE

El cliente debe poder abrir su rutina desde su teléfono.

Para cada ejercicio:

Mostrar:

Series.

Repeticiones.

Peso.

Descanso.

RIR/RPE.

Video/instrucciones.

El cliente puede registrar:

Peso utilizado.

Repeticiones.

Series completadas.

RIR.

RPE.

Notas.

Dolor/molestias.

Al finalizar:

Mostrar entrenamiento completado.

Actualizar automáticamente estadísticas.

==================================================




FUERZA Y RÉCORDS

Registrar automáticamente:

Mejor peso.

Mejor repetición.

1RM estimado.

3RM.

5RM.

Volumen.

PR.

Cuando el cliente consiga un nuevo récord:

Mostrar una animación:

🏆 NUEVO RÉCORD

Crear sección:

“Mis récords”

Con gráficos de progreso.

==================================================




PROGRESO

Crear gráficos para:

Peso.

Grasa corporal.

Masa muscular.

Cintura.

Cadera.

Medidas.

Fuerza.

Volumen.

Adherencia.

Filtros:

7 días
30 días
3 meses
6 meses
1 año
Todo

==================================================




NUTRICIÓN

Crear módulo de nutrición.

El entrenador puede crear:

Calorías.

Proteínas.

Carbohidratos.

Grasas.

Agua.

Desayuno.

Almuerzo.

Cena.

Snacks.

Crear biblioteca de alimentos.

Cada alimento:

Nombre.

Calorías.

Proteína.

Carbohidratos.

Grasas.

Porción.

Crear sustituciones.

Ejemplo:

POLLO
→ pescado
→ carne magra
→ huevos

El cliente podrá consultar su plan nutricional desde su aplicación.

==================================================




CHECK-IN

Crear check-in semanal.

Preguntas:

¿Cómo te fue esta semana?

Energía.

Sueño.

Estrés.

Hambre.

Motivación.

Entrenamientos realizados.

Cumplimiento nutricional.

Dolor/molestias.

Peso.

Comentarios.

Estados:

PENDIENTE
COMPLETADO
REVISADO

El entrenador recibe alertas de nuevos check-ins.

==================================================




HÁBITOS

Permitir asignar hábitos.

Ejemplos:

💧 Agua
🚶 Pasos
😴 Sueño
🥩 Proteína
🏋️ Entrenamiento
🥗 Alimentación

El cliente marca los hábitos diariamente.

Mostrar:

Porcentaje.

Racha.

Calendario.

Historial.

==================================================




CHAT

Crear chat privado entre entrenador y cliente.

Permitir:

Texto.

Imágenes.

Videos.

Archivos.

Audios si técnicamente es viable.

Mostrar mensajes no leídos.

Crear notificaciones.

==================================================




AGENDA

Crear calendario.

El entrenador puede:

Crear sesión.

Asignar cliente.

Fecha.

Hora.

Duración.

Notas.

Confirmar.

Cancelar.

Reprogramar.

El cliente puede consultar sus próximas sesiones.

Crear recordatorios.

==================================================




PAGOS DE CLIENTES

Crear módulo financiero.

Registrar:

Cliente.

Plan.

Precio.

Fecha de inicio.

Próximo pago.

Método.

Estado.

Estados:

ACTIVO
PENDIENTE
VENCIDO
CANCELADO

Crear dashboard financiero.

==================================================




MEMBRESÍA DEL ENTRENADOR

Cada entrenador tendrá una suscripción a FITCORE.

Mostrar:

PLAN ACTUAL
PRECIO
CLIENTES UTILIZADOS
LÍMITE
PRÓXIMO COBRO
ESTADO

Crear página:

“Mi suscripción”

Preparar la estructura para pagos recurrentes.

==================================================




WHITE LABEL

Para planes superiores permitir:

Logo.

Nombre comercial.

Color principal.

Imagen.

Redes sociales.

El entrenador podrá personalizar su espacio.

==================================================




REPORTES

Crear generador de reportes profesionales.

Reporte mensual:

Peso inicial.

Peso actual.

Grasa inicial.

Grasa actual.

Medidas.

Fuerza.

Adherencia.

Entrenamientos.

Hábitos.

Fotos antes/después.

Comentario del entrenador.

Permitir descargar PDF.

==================================================




GAMIFICACIÓN

Crear logros:

🏆 Primer entrenamiento
🏆 10 entrenamientos
🏆 50 entrenamientos
🏆 100 entrenamientos
🏆 Primer PR
🏆 30 días consecutivos
🏆 -5 kg
🏆 -10 cm

Crear niveles.

Mostrar progreso del cliente.

==================================================




NOTIFICACIONES

Crear centro de notificaciones.

Para cliente:

“Tu entrenamiento está listo.”

“Tu check-in está pendiente.”

“Tu entrenador te escribió.”

“Nuevo récord personal.”

Para entrenador:

“Juan lleva 5 días sin entrenar.”

“María completó su check-in.”

“Pedro consiguió un nuevo PR.”

“Hay pagos pendientes.”

==================================================




INTELIGENCIA ARTIFICIAL

Preparar módulo de IA.

Crear botón:

“✨ Asistente IA”

Funciones:

Analizar progreso.

Crear rutinas.

Sugerir progresiones.

Crear reportes.

Analizar adherencia.

Detectar clientes que necesitan atención.

La IA debe utilizar los datos reales disponibles del cliente.

No inventar datos.

No realizar diagnósticos médicos.

==================================================




GIMNASIOS

Preparar arquitectura para gimnasios.

Un gimnasio puede tener:

GIMNASIO
↓
ADMINISTRADOR
↓
ENTRENADORES
↓
CLIENTES

El administrador del gimnasio puede gestionar sus entrenadores y clientes.

Cada entrenador solamente puede acceder a sus clientes.

==================================================




BASE DE DATOS

Diseñar una base de datos escalable con entidades relacionadas:

Users
Trainers
Clients
Gyms
Subscriptions
SubscriptionPlans
Assessments
Measurements
ProgressPhotos
Exercises
WorkoutTemplates
Workouts
WorkoutExercises
WorkoutLogs
PersonalRecords
NutritionPlans
Foods
Meals
Habits
HabitLogs
CheckIns
Messages
Appointments
Payments
Achievements
Notifications
Reports

Implementar correctamente:

Relaciones.

IDs.

Fechas.

Historial.

Permisos.

Seguridad.

Multi-tenancy.

==================================================




SEGURIDAD

Implementar control de acceso basado en roles.

SUPER ADMIN:
Acceso completo.

ENTRENADOR:
Solamente sus clientes.

CLIENTE:
Solamente sus propios datos.

GIMNASIO:
Solamente sus entrenadores y clientes.

No permitir acceso cruzado entre cuentas.

==================================================




RESPONSIVE

La aplicación debe funcionar perfectamente en:

iPhone.

Android.

Tablet.

Laptop.

Desktop.

La experiencia móvil del cliente es especialmente importante.

El cliente debe poder realizar su entrenamiento cómodamente desde el teléfono.

==================================================




NAVEGACIÓN

ENTRENADOR:

Dashboard
Clientes
Rutinas
Ejercicios
Nutrición
Agenda
Mensajes
Pagos
Reportes
Mi suscripción
Configuración

CLIENTE:

Inicio
Entrenamiento
Progreso
Nutrición
Hábitos
Check-in
Chat
Agenda
Logros
Perfil

SUPER ADMIN:

Dashboard
Entrenadores
Gimnasios
Clientes
Planes
Suscripciones
Pagos
Reportes
Configuración

==================================================




EXPERIENCIA DEL CLIENTE

El cliente debe abrir la aplicación y sentir que tiene un entrenador personal digital.

En el inicio mostrar:

“Hola, Juan 👋”

“Tu progreso”

Peso actual
Grasa corporal
Entrenamientos
Adherencia

“Entrenamiento de hoy”

“Tu próximo objetivo”

“Racha actual”

“Últimos logros”

==================================================




EXPERIENCIA DEL ENTRENADOR

El entrenador debe sentir que FITCORE es el centro de operaciones de su negocio.

Desde el dashboard debe poder saber rápidamente:

Quién está progresando.

Quién está estancado.

Quién no está entrenando.

Quién necesita atención.

Quién debe pagar.

Qué sesiones tiene.

Qué check-ins debe revisar.

==================================================




REGLAS IMPORTANTES DE DESARROLLO

No crear páginas estáticas sin funcionalidad.

No utilizar datos falsos una vez exista la base de datos.

Todas las acciones importantes deben persistir los datos.

Crear estados de carga.

Crear estados vacíos.

Crear mensajes de error claros.

Crear confirmaciones para acciones destructivas.

Validar formularios.

Mantener una excelente experiencia móvil.

Mantener consistencia visual en toda la aplicación.

No romper funcionalidades existentes mientras se desarrollan nuevas funciones.

Crear componentes reutilizables.

Mantener el código limpio y organizado.

Preparar la arquitectura para crecimiento futuro.

No llenar la interfaz de elementos innecesarios.

==================================================




OBJETIVO FINAL

Quiero que FITCORE sea una plataforma SaaS completa para entrenadores personales y gimnasios.

El flujo principal debe ser:

ENTRENADOR SE REGISTRA
↓
ELIGE PLAN
↓
CREA SU PERFIL
↓
AGREGA CLIENTES
↓
REALIZA EVALUACIÓN
↓
CREA RUTINA
↓
ASIGNA RUTINA
↓
CLIENTE ENTRENA
↓
CLIENTE REGISTRA SUS RESULTADOS
↓
FITCORE ACTUALIZA PROGRESO
↓
SE DETECTAN PR Y ESTADÍSTICAS
↓
CLIENTE REALIZA CHECK-IN
↓
ENTRENADOR REVISA
↓
SE ACTUALIZA EL PLAN
↓
SE GENERA REPORTE
↓
SE RENUEVA LA MEMBRESÍA

La aplicación debe sentirse como una mezcla de:

PLATAFORMA DE GESTIÓN + APP DE ENTRENAMIENTO + CRM DE CLIENTES + SISTEMA DE NUTRICIÓN + SISTEMA DE PROGRESO + SaaS PARA ENTRENADORES.

Prioriza funcionalidad real, escalabilidad, seguridad, excelente UX y un diseño premium NEGRO + AZUL NEÓN + BLANCO.

Antes de comenzar a desarrollar, analiza toda esta especificación, define la arquitectura de la aplicación y luego comienza a construirla por módulos sin sacrificar la calidad ni crear funcionalidades desconectadas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://corefit-suite.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f5b22f84-ede5-4864-a6b0-b4cdd99b4d9f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
