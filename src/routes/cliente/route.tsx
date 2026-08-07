import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, Flame, Percent, Trophy } from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";
import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/fitcore/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/fitcore";
import { LayoutDashboard } from "lucide-react";

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
