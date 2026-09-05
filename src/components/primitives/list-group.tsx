import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul
      role="list"
      className={cn("divide-y divide-line rounded-panel border border-line bg-surface", className)}
    >
      {children}
    </ul>
  );
}

export function ListItem({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("px-4 py-3", className)}>{children}</li>;
}
