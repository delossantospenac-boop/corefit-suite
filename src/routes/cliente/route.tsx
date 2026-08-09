import { createFileRoute } from "@tanstack/react-router";
import {
  Apple,
  CalendarDays,
  Camera,
  ClipboardList,
  Dumbbell,
  Flame,
  Home,
  MessageSquare,
  Trophy,
  TrendingUp,
  User,
} from "lucide-react";

import { AppShell, type NavItem } from "@/components/fitcore/app-shell";
import { RoleGate } from "@/components/fitcore/role-gate";

const items: NavItem[] = [
  { to: "/cliente", label: "Inicio", icon: Home, exact: true },
  { to: "/cliente/rutina", label: "Mi rutina", icon: Dumbbell },
  { to: "/cliente/progreso", label: "Mi progreso", icon: TrendingUp },
  { to: "/cliente/clases", label: "Mis clases", icon: CalendarDays },
  { to: "/cliente/evaluaciones", label: "Mis evaluaciones", icon: ClipboardList },
  { to: "/cliente/fotos", label: "Mis fotos", icon: Camera },
  { to: "/cliente/nutricion", label: "Nutrición", icon: Apple },
  { to: "/cliente/habitos", label: "Hábitos", icon: Flame },
  { to: "/cliente/chat", label: "Chat", icon: MessageSquare },
  { to: "/cliente/logros", label: "Logros", icon: Trophy },
  { to: "/cliente/perfil", label: "Mi perfil", icon: User },
];

const mobileItems: NavItem[] = [
  { to: "/cliente", label: "Inicio", icon: Home, exact: true },
  { to: "/cliente/rutina", label: "Rutina", icon: Dumbbell },
  { to: "/cliente/clases", label: "Clases", icon: CalendarDays },
  { to: "/cliente/progreso", label: "Progreso", icon: TrendingUp },
  { to: "/cliente/perfil", label: "Perfil", icon: User },
];

export const Route = createFileRoute("/cliente")({
  ssr: false,
  component: ClientArea,
});

function ClientArea() {
  return (
    <RoleGate allow={["client"]}>
      <AppShell items={items} mobileItems={mobileItems} areaLabel="Mi entrenamiento" />
    </RoleGate>
  );
}
