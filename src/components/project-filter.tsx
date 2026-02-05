"use client"

import { Button } from "@/components/ui/button"

interface ProjectFilterProps {
  currentFilter: "all" | "active" | "finished"
  onFilterChange: (filter: "all" | "active" | "finished") => void
}

export function ProjectFilter({ currentFilter, onFilterChange }: ProjectFilterProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={currentFilter === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("all")}
      >
        All Projects
      </Button>
      <Button
        variant={currentFilter === "active" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("active")}
      >
        Active
      </Button>
      <Button
        variant={currentFilter === "finished" ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange("finished")}
      >
        Finished
      </Button>
    </div>
  )
}