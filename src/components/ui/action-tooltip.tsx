"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface ActionTooltipProps {
  label: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "center" | "start" | "end";
  sideOffset?: number;
}

export function ActionTooltip({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset = 4,
}: ActionTooltipProps) {
  if (!label) return children;

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} align={align} sideOffset={sideOffset}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
