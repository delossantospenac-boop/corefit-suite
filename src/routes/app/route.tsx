import { createFileRoute } from "@tanstack/react-router";
import {
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";
import { useAuth } from "@/lib/auth-context";

const baseItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/rutinas", label: "Rutinas", icon: Dumbbell },
  { to: "/app/ejercicios", label: "Ejercicios", icon: ListChecks },
  { to: "/app/clases", label: "Clases", icon: CalendarDays },
  { to: "/app/ajustes", label: "Unidades", icon: Settings },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  component: TrainerLayout,
});

function TrainerLayout() {
  const { role } = useAuth();
  const items =
    role === "super_admin"
      ? [...baseItems, { to: "/admin", label: "Administración", icon: ShieldCheck } as NavItem]
      : baseItems;

  return (
    <RoleGate allow={["trainer", "gym_admin", "super_admin"]}>
      <AppShell items={items} areaLabel={role === "super_admin" ? "Mi gestión" : "Entrenador"} />
    </RoleGate>
  );
}
