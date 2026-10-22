"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { BoxIcon } from "@/components/ui/box-icon"

export interface CheckboxProps
  extends Omit<CheckboxPrimitive.Root.Props, "checked"> {
  checked?: boolean | "indeterminate"
  indeterminate?: boolean
}

function Checkbox({
  className,
  checked,
  indeterminate: indeterminateProp,
  ...props
}: CheckboxProps) {
  const isIndeterminate = checked === "indeterminate" || !!indeterminateProp
  const isChecked = checked === true

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={isChecked}
      indeterminate={isIndeterminate}
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground cursor-pointer",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        {isIndeterminate ? (
          <BoxIcon name="minus" className="text-sm font-bold" />
        ) : (
          <BoxIcon name="check" className="text-sm font-bold" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
