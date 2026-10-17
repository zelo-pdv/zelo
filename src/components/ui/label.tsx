"use client"

import * as React from "react"

import { cn } from "@/lib/utils";
import { getRequiredAsteriskProps } from "@/lib/forms";

export interface LabelProps extends React.ComponentProps<"label"> {
  required?: boolean;
}

const asteriskProps = getRequiredAsteriskProps();

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span
          className={asteriskProps.className}
          title={asteriskProps.title}
          aria-hidden={asteriskProps["aria-hidden"]}
        >
          {asteriskProps.symbol}
        </span>
      )}
    </label>
  );
}

export { Label };
