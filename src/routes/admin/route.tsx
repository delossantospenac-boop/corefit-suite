import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";

const items: NavItem[] = [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }];

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminArea,
});

function AdminArea() {
  return (
    <RoleGate allow={["super_admin"]}>
      <AppShell items={items} areaLabel="Super admin" />
    </RoleGate>
  );
}
