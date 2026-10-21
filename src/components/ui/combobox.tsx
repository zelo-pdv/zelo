"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { BoxIcon } from "@/components/ui/box-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
  keywords?: string[]
  group?: string
}

export interface ComboboxProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  size?: "sm" | "default"
  align?: "start" | "center" | "end"
  side?: "bottom" | "top"
  sideOffset?: number
  clearable?: boolean
}

export function Combobox({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  options = [],
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado encontrado.",
  disabled = false,
  required = false,
  name,
  id,
  className,
  triggerClassName,
  contentClassName,
  size = "default",
  align = "start",
  side = "bottom",
  sideOffset = 4,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : uncontrolledValue

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === currentValue)
  }, [options, currentValue])

  const handleSelect = React.useCallback(
    (val: string) => {
      if (!isControlled) {
        setUncontrolledValue(val)
      }
      onValueChange?.(val)
      setOpen(false)
    },
    [isControlled, onValueChange]
  )

  // Agrupamento de opções se houver a propriedade group
  const groupedOptions = React.useMemo(() => {
    const hasGroups = options.some((opt) => !!opt.group)
    if (!hasGroups) {
      return { "": options }
    }
    const groups: Record<string, ComboboxOption[]> = {}
    for (const opt of options) {
      const g = opt.group || ""
      if (!groups[g]) groups[g] = []
      groups[g].push(opt)
    }
    return groups
  }, [options])

  return (
    <div className={cn("relative inline-block w-full", className)}>
      {/* Campo oculto para submissão nativa de formulários HTML */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue ?? ""}
          required={required}
          disabled={disabled}
        />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          data-slot="combobox-trigger"
          data-size={size}
          data-placeholder={!selectedOption}
          className={cn(
            "flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 text-left cursor-pointer",
            triggerClassName
          )}
        >
          <span className="truncate flex-1">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <BoxIcon
            name="chevron-down"
            className={cn(
              "pointer-events-none text-base text-muted-foreground shrink-0 opacity-70 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </PopoverTrigger>

        <PopoverContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={cn(
            "w-(--anchor-width) min-w-[200px] p-0 shadow-md ring-1 ring-foreground/10 rounded-lg",
            contentClassName
          )}
        >
          <Command className="w-full">
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>{emptyText}</CommandEmpty>
              {Object.entries(groupedOptions).map(([groupTitle, groupItems]) => {
                const itemsList = groupItems.map((opt) => {
                  const isSelected = opt.value === currentValue
                  const filterSearchText = [opt.label, opt.value, ...(opt.keywords || [])]
                    .join(" ")
                    .trim()

                  return (
                    <CommandItem
                      key={opt.value}
                      value={filterSearchText}
                      disabled={opt.disabled}
                      onSelect={() => handleSelect(opt.value)}
                      className="flex items-center justify-between text-xs sm:text-sm py-1.5 px-2 cursor-pointer"
                    >
                      <span className="truncate flex-1">{opt.label}</span>
                      {isSelected && (
                        <BoxIcon
                          name="check"
                          className="pointer-events-none text-base text-foreground shrink-0 ml-2"
                        />
                      )}
                    </CommandItem>
                  )
                })

                if (groupTitle) {
                  return (
                    <CommandGroup key={groupTitle} heading={groupTitle}>
                      {itemsList}
                    </CommandGroup>
                  )
                }

                return (
                  <CommandGroup key="default-group">
                    {itemsList}
                  </CommandGroup>
                )
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
