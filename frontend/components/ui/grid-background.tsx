"use client";
import { cn } from "../../lib/utils";

export function GridBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("h-full w-full bg-black bg-grid-white/[0.05] relative flex items-center justify-center", className)}>
      {/* Radial gradient for the faded look */}
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      {children}
    </div>
  );
}

export function DotBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("h-full w-full bg-black bg-dot-white/[0.2] relative flex items-center justify-center", className)}>
      {/* Radial gradient for the faded look */}
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      {children}
    </div>
  );
}

export function GridSmallBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("h-full w-full bg-black bg-grid-small-white/[0.2] relative flex items-center justify-center", className)}>
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      {children}
    </div>
  );
}
