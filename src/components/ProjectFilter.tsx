"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ProjectFilterProps {
  currentFilter: "all" | "active" | "finished"
  onFilterChange: (filter: "all" | "active" | "finished") => void
  counts: {
    all: number
    active: number
    finished: number
  }
}

export function ProjectFilter({ currentFilter, onFilterChange, counts }: ProjectFilterProps) {
  const filters = [
    { key: "all" as const, label: "All Projects", count: counts.all },
    { key: "active" as const, label: "Active", count: counts.active },
    { key: "finished" as const, label: "Finished", count: counts.finished },
  ]

  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={currentFilter === filter.key ? "default" : "ghost"}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            "relative px-3 py-1.5 text-sm font-medium transition-all",
            currentFilter === filter.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {filter.label}
          {filter.count > 0 && (
            <span
              className={cn(
                "ml-2 inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5",
                currentFilter === filter.key
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}
            >
              {filter.count}
            </span>
          )}
        </Button>
      ))}
    </div>
  )
}