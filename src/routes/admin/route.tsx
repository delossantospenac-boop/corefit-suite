import { createFileRoute } from "@tanstack/react-router";
import { Activity, CreditCard, LayoutDashboard, Layers, UserCog, Users } from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";

const items: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/entrenadores", label: "Entrenadores", icon: UserCog },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/suscripciones", label: "Suscripciones", icon: CreditCard },
  { to: "/admin/planes", label: "Planes", icon: Layers },
  { to: "/admin/actividad", label: "Actividad", icon: Activity },
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
