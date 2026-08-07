import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileBarChart,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Salad,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";

const items: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/rutinas", label: "Rutinas", icon: ListChecks },
  { to: "/app/ejercicios", label: "Ejercicios", icon: Dumbbell },
  { to: "/app/nutricion", label: "Nutrición", icon: Salad },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/mensajes", label: "Mensajes", icon: MessageSquare },
  { to: "/app/pagos", label: "Pagos", icon: CreditCard },
  { to: "/app/reportes", label: "Reportes", icon: FileBarChart },
  { to: "/app/suscripcion", label: "Mi suscripción", icon: Sparkles },
  { to: "/app/configuracion", label: "Configuración", icon: Settings },
];

const mobileItems: NavItem[] = [
  { to: "/app", label: "Inicio", icon: LayoutDashboard, exact: true },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/rutinas", label: "Rutinas", icon: ListChecks },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/mensajes", label: "Chat", icon: MessageSquare },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  component: TrainerLayout,
});

function TrainerLayout() {
  return (
    <RoleGate allow={["trainer", "gym_admin"]}>
      <AppShell items={items} mobileItems={mobileItems} areaLabel="Entrenador" />
    </RoleGate>
  );
}
