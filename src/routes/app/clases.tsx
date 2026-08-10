import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Calendar,
  CalendarCheck2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ListSkeleton, PageHeader, StatCard } from "@/components/fitcore/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDateTime, fetchClients, type ClientRow } from "@/lib/fitcore";
import {
  CLASS_STATUSES,
  CLASS_TYPES,
  classPackage,
  classStatusTone,
  completeClass,
  createClass,
  deleteClass,
  fetchClasses,
  fetchClientClasses,
  rangeFor,
  startClass,
  updateClass,
  type ClassWithClient,
  type RangeKey,
} from "@/lib/clases";
import { fetchClientRoutines, fetchRoutine, prettyLabel, type FullRoutine, type RoutineRow } from "@/lib/rutinas";
import { formatWeight } from "@/lib/units";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/clases")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clases · FITCORE" },
      {
        name: "description",
        content: "Agenda, gestiona y completa las clases de tus clientes.",
      },
    ],
  }),
  component: ClasesPage;
});
