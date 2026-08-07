import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = "md",
  showText = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-xl gradient-neon text-primary-foreground glow",
          box,
        )}
      >
        <Zap className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2.6} />
      </div>
      {showText && (
        <span className={cn("font-semibold tracking-[0.18em] text-foreground", text)}>
          FIT<span className="text-neon">CORE</span>
        </span>
      )}
    </div>
  );
}
