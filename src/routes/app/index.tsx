import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Percent,
  Trophy,
  Users,
  ClipboardCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  currency,
  daysSince,
  fetchClients,
  formatDateTime,
  startOfWeekISO,
  type ClientRow,
} from "@/lib/fitcore";

export const Route = createFileRoute("/app/")({
  ssr: false,
  component: TrainerDashboard,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

type Attention = { id: string; clientId: string; text: string };

function TrainerDashboard() {
  const { profile } = useAuth();
  const firstName = (profile?.full_name || "").split(" ")[0] || "entrenador";

  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const clients = clientsQuery.data ?? [];

  const weekStart = startOfWeekISO();

  const statsQuery = useQuery({
    queryKey: ["trainer-stats", weekStart],
    queryFn: async () => {
      const since = new Date(Date.now() - 56 * 86_400_000).toISOString();
      const [logs, checkins, payments, appointments, prs] = await Promise.all([
        supabase.from("workout_logs").select("id, client_id, performed_at").gte("performed_at", since),
        supabase.from("check_ins").select("id, client_id, status, week_start, submitted_at"),
        supabase.from("payments").select("id, client_id, amount, status, next_payment_date, paid_at"),
        supabase
          .from("appointments")
          .select("id, client_id, title, starts_at, status")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
          .limit(6),
        supabase
          .from("personal_records")
          .select("id, client_id, record_type, value, achieved_on, exercise_id")
          .order("achieved_on", { ascending: false })
          .limit(6),
      ]);
      return {
        logs: logs.data ?? [],
        checkins: checkins.data ?? [],
        payments: payments.data ?? [],
        appointments: appointments.data ?? [],
        prs: prs.data ?? [],
      };
    },
  });

  const s = statsQuery.data;
  const nameOf = (id: string) => clients.find((c) => c.id === id)?.full_name ?? "Cliente";

  const activeClients = clients.filter((c) => c.status === "activo").length;
  const weekLogs = (s?.logs ?? []).filter((l) => l.performed_at.slice(0, 10) >= weekStart).length;
  const pendingCheckins = (s?.checkins ?? []).filter((c) => c.status !== "revisado").length;
  const pendingPayments = (s?.payments ?? []).filter(
    (p) => p.status === "pendiente" || p.status === "vencido",
  );
  const monthIncome = (s?.payments ?? [])
    .filter((p) => p.paid_at && p.paid_at.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);

  // Adherencia = entrenamientos de la semana / (clientes activos * 3 sesiones objetivo)
  const target = Math.max(activeClients * 3, 1);
  const adherence = Math.min(100, Math.round((weekLogs / target) * 100));

  const attention: Attention[] = [];
  for (const c of clients) {
    if (c.status !== "activo") continue;
    const d = daysSince(c.last_activity_at);
    if (d === null) {
      attention.push({
        id: `${c.id}-nunca`,
        clientId: c.id,
        text: `${c.full_name} aún no ha registrado ningún entrenamiento.`,
      });
    } else if (d >= 5) {
      attention.push({
        id: `${c.id}-inactivo`,
        clientId: c.id,
        text: `${c.full_name} lleva ${d} días sin entrenar.`,
      });
    }
  }
  for (const ci of s?.checkins ?? []) {
    if (ci.status === "pendiente") {
      attention.push({
        id: `${ci.id}-checkin`,
        clientId: ci.client_id,
        text: `${nameOf(ci.client_id)} no ha realizado su check-in.`,
      });
    }
  }
  for (const p of pendingPayments) {
    attention.push({
      id: `${p.id}-pago`,
      clientId: p.client_id,
      text: `${nameOf(p.client_id)} tiene un pago ${p.status}.`,
    });
  }

  const chartData = buildWeeklyChart(s?.logs ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            {greeting()}, {firstName} <span aria-hidden>👋</span>
          </>
        }
        subtitle="Este es el estado de tu negocio hoy."
        action={
          <Button asChild>
            <Link to="/app/clientes">
              <Users className="mr-2 h-4 w-4" /> Mis clientes
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Clientes activos"
          value={activeClients}
          icon={Users}
          loading={clientsQuery.isLoading}
          hint={`${clients.length} en total`}
        />
        <StatCard
          label="Entrenos esta semana"
          value={weekLogs}
          icon={Dumbbell}
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Adherencia promedio"
          value={`${adherence}%`}
          icon={Percent}
          tone={adherence >= 70 ? "success" : "warning"}
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Ingresos del mes"
          value={currency(monthIncome)}
          icon={CreditCard}
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Check-ins pendientes"
          value={pendingCheckins}
          icon={ClipboardCheck}
          tone={pendingCheckins > 0 ? "warning" : "success"}
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Pagos pendientes"
          value={pendingPayments.length}
          icon={CreditCard}
          tone={pendingPayments.length > 0 ? "destructive" : "success"}
          loading={statsQuery.isLoading}
        />
      </div>

      <SectionCard
        title="Actividad de entrenamientos"
        subtitle="Sesiones completadas por semana (últimas 8 semanas)"
      >
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="neonArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neon)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--neon)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Entrenamientos"
                stroke="var(--neon)"
                strokeWidth={2}
                fill="url(#neonArea)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Clientes que necesitan atención">
          {attention.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Todo en orden"
              description="Ningún cliente requiere atención inmediata."
            />
          ) : (
            <ul className="space-y-2">
              {attention.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <Link
                    to="/app/clientes/$clientId"
                    params={{ clientId: a.clientId }}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm transition-colors hover:border-primary/40"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    <span className="min-w-0 flex-1 truncate">{a.text}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Próximas sesiones">
          {(s?.appointments ?? []).length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin sesiones agendadas"
              description="Agenda una sesión con tus clientes."
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link to="/app/agenda">Ir a la agenda</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {(s?.appointments ?? []).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
                >
                  <CalendarDays className="h-4 w-4 shrink-0 text-neon" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{nameOf(a.client_id)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.title} · {formatDateTime(a.starts_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                    {a.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Últimos récords">
          {(s?.prs ?? []).length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Aún no hay récords"
              description="Los récords aparecen cuando tus clientes registran sus entrenamientos."
            />
          ) : (
            <ul className="space-y-2">
              {(s?.prs ?? []).map((pr) => (
                <li
                  key={pr.id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
                >
                  <Trophy className="h-4 w-4 shrink-0 text-neon" />
                  <span className="min-w-0 flex-1 truncate">{nameOf(pr.client_id)}</span>
                  <span className="shrink-0 font-medium text-neon">
                    {pr.value} {pr.record_type === "volumen" ? "kg vol." : "kg"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Actividad reciente">
          <RecentActivity logs={s?.logs ?? []} clients={clients} />
        </SectionCard>
      </div>
    </div>
  );
}

function RecentActivity({
  logs,
  clients,
}: {
  logs: { id: string; client_id: string; performed_at: string }[];
  clients: ClientRow[];
}) {
  const recent = [...logs]
    .sort((a, b) => b.performed_at.localeCompare(a.performed_at))
    .slice(0, 6);

  if (recent.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Sin actividad todavía"
        description="Cuando tus clientes entrenen, verás su actividad aquí."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {recent.map((l) => (
        <li
          key={l.id}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm"
        >
          <Dumbbell className="h-4 w-4 shrink-0 text-neon" />
          <span className="min-w-0 flex-1 truncate">
            {clients.find((c) => c.id === l.client_id)?.full_name ?? "Cliente"} completó un
            entrenamiento
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDateTime(l.performed_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function buildWeeklyChart(logs: { performed_at: string }[]) {
  const weeks: { label: string; total: number; start: number }[] = [];
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();

  for (let i = 7; i >= 0; i--) {
    const start = monday - i * 7 * 86_400_000;
    weeks.push({
      label: new Date(start).toLocaleDateString("es", { day: "2-digit", month: "short" }),
      total: 0,
      start,
    });
  }
  for (const l of logs) {
    const t = new Date(l.performed_at).getTime();
    for (let i = weeks.length - 1; i >= 0; i--) {
      const w = weeks[i];
      if (w && t >= w.start) {
        w.total += 1;
        break;
      }
    }
  }
  return weeks.map(({ label, total }) => ({ label, total }));
}
