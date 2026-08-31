import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiPlanExercise = {
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  sets: number;
  reps: string;
  rest_seconds: number;
  rir: number | null;
  rpe: number | null;
  tempo: string | null;
  notes: string | null;
};

export type AiPlanDay = {
  name: string;
  description: string | null;
  exercises: AiPlanExercise[];
};

export type AiPlan = {
  name: string;
  description: string;
  notes: string;
  days: AiPlanDay[];
};

export type AiPlanInput = {
  goal: string;
  level: string;
  daysPerWeek: number;
  weeks: number;
  style: string;
  clientName?: string | null;
  clientInfo?: string | null;
  library: string[];
};

const SYSTEM = `Eres un entrenador personal certificado de élite. Diseñas rutinas de entrenamiento seguras, progresivas y realistas.
Responde SIEMPRE en español y SOLO con JSON válido (sin markdown, sin explicaciones) con esta forma exacta:
{"name":string,"description":string,"notes":string,"days":[{"name":string,"description":string,"exercises":[{"name":string,"muscle_group":string,"equipment":string,"sets":number,"reps":string,"rest_seconds":number,"rir":number,"rpe":number,"tempo":string,"notes":string}]}]}
Reglas de programación:
- Para CADA ejercicio prescribe obligatoriamente sets, reps, descanso, RIR, RPE (intensidad) y tempo cuando sea apropiado.
- RIR debe ser un número de 0 a 5 y representar las repeticiones que deberían quedar en reserva al terminar la serie.
- RPE debe ser un número de 1 a 10 y representar la intensidad objetivo. Mantén coherencia entre RPE y RIR (por ejemplo, RIR 2 ≈ RPE 8).
- La intensidad debe quedar definida mediante RPE/RIR; NO calcules ni inventes kilos o cargas.
- NUNCA asignes peso en kg. El peso de cada ejercicio lo seleccionará y ajustará el entrenador según el cliente.
- sets debe ser un entero entre 1 y 10.
- rest_seconds debe ser un entero entre 15 y 600 y debe adecuarse al ejercicio y objetivo.
- reps es texto (ej. "10", "8-12", "30 seg").
- tempo debe indicar el ritmo cuando sea útil (ej. "3-1-1-0") y puede ser null cuando no aplique.
- notes debe incluir indicaciones prácticas de ejecución y, cuando ayude, una indicación breve de la intensidad objetivo.
- Entre 4 y 8 ejercicios por día. Un día por cada sesión semanal solicitada.
- Distribuye el volumen y la intensidad de forma razonable según objetivo y nivel. Evita llevar todos los ejercicios al fallo.
- Prioriza ejercicios de la biblioteca que te pasen; puedes añadir otros si el objetivo lo requiere.`;

export const generateRoutinePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AiPlanInput) => data)
  .handler(async ({ data }): Promise<AiPlan> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("La IA no está configurada en este proyecto.");

    const prompt = [
      `Objetivo del cliente: ${data.goal}.`,
      `Nivel: ${data.level}.`,
      `Sesiones por semana: ${data.daysPerWeek}. Duración del plan: ${data.weeks} semanas.`,
      `Estilo de entrenamiento: ${data.style}.`,
      data.clientName ? `Cliente: ${data.clientName}.` : "",
      data.clientInfo ? `Notas del cliente: ${data.clientInfo}` : "",
      data.library.length
        ? `Biblioteca de ejercicios disponible (usa estos nombres exactos cuando encajen): ${data.library.slice(0, 220).join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Límite de solicitudes alcanzado. Intenta de nuevo en un momento.");
    if (res.status === 402) throw new Error("Se agotaron los créditos de IA del espacio de trabajo.");
    if (!res.ok) {
      console.error("[ai-rutinas] gateway error", res.status, await res.text());
      throw new Error("No se pudo generar la rutina. Intenta de nuevo.");
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: AiPlan;
    try {
      parsed = JSON.parse(content.replace(/^```json\s*|```$/g, "").trim()) as AiPlan;
    } catch {
      throw new Error("La IA devolvió una respuesta no válida. Intenta de nuevo.");
    }
    if (!parsed?.days?.length) throw new Error("La IA no devolvió días de entrenamiento.");
    return parsed;
  });
