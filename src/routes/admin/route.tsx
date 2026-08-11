import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Layers,
  ListChecks,
  Settings,
  UserCog,
  Users,
} from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";

const items: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/entrenadores", label: "Entrenadores", icon: UserCog },
  { to: "/admin/clientes", label: "Clientes (global)", icon: Users },
  { to: "/admin/suscripciones", label: "Suscripciones", icon: CreditCard },
  { to: "/admin/planes", label: "Planes", icon: Layers },
  { to: "/admin/actividad", label: "Actividad", icon: Activity },
  // Mi trabajo como entrenador (cuenta principal)
  { to: "/app/clientes", label: "Mis clientes", icon: Users },
  { to: "/app/rutinas", label: "Rutinas", icon: Dumbbell },
  { to: "/app/ejercicios", label: "Ejercicios", icon: ListChecks },
  { to: "/app/clases", label: "Clases", icon: CalendarDays },
  { to: "/app/ajustes", label: "Unidades", icon: Settings },
];

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminArea,
});

function AdminArea() {
  return (
    <RoleGate allow={["super_admin"]}>
      <AppShell items={items} areaLabel="Administración" />
    </RoleGate>
  );
}
