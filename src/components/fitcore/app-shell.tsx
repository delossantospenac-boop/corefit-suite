import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { Bell, LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Logo } from "@/components/fitcore/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.exact ?? false }}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground"
          activeProps={{
            className:
              "bg-primary/12 text-foreground font-medium shadow-[inset_2px_0_0_0_var(--neon)]",
          }}
        >
          <item.icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-neon" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function NotificationsBell() {
  const { user } = useAuth();
  const { data: count = 0 } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      return count ?? 0;
    },
  });

  return (
    <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary animate-neon-pulse" />
      )}
    </Button>
  );
}

export function AppShell({
  items,
  areaLabel,
  mobileItems,
}: {
  items: NavItem[];
  areaLabel: string;
  mobileItems?: NavItem[];
}) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const bottom = (mobileItems ?? items).slice(0, 5);

  async function handleSignOut() {
    await signOut();
    void router.navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name || "FC")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <p className="px-5 pb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {areaLabel}
        </p>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks items={items} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-neon">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.full_name || "Mi cuenta"}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:pl-[17rem]">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <div className="flex h-16 items-center justify-between px-5">
                <Logo />
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-3 pb-6">
                <NavLinks items={items} onNavigate={() => setOpen(false)} />
                <Button
                  variant="ghost"
                  className="mt-4 w-full justify-start gap-3 text-muted-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Logo showText={false} size="sm" />
        </div>
        <div className="flex-1" />
        <NotificationsBell />
      </header>

      <main className="px-4 pb-24 pt-5 lg:pb-10 lg:pl-[17rem] lg:pr-6">
        <div className="mx-auto w-full max-w-6xl animate-rise-in">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {bottom.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground transition-colors"
              activeProps={{ className: "text-neon" }}
            >
              <item.icon className="h-5 w-5" />
              <span className={cn("truncate px-1")}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
