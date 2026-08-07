import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";

const items: NavItem[] = [{ to: "/cliente", label: "Inicio", icon: LayoutDashboard, exact: true }];

export const Route = createFileRoute("/cliente")({
  ssr: false,
  component: ClientArea,
});

function ClientArea() {
  return (
    <RoleGate allow={["client"]}>
      <AppShell items={items} areaLabel="Mi entrenamiento" />
    </RoleGate>
  );
}
