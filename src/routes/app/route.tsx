import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Users } from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";

const items: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/clientes", label: "Clientes", icon: Users },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  component: TrainerLayout,
});

function TrainerLayout() {
  return (
    <RoleGate allow={["trainer", "gym_admin"]}>
      <AppShell items={items} areaLabel="Entrenador" />
    </RoleGate>
  );
}
