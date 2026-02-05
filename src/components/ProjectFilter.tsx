"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterType = "active" | "finished";

interface ProjectFilterProps {
  onFilterChange: (filter: FilterType) => void;
  defaultFilter?: FilterType;
}

export function ProjectFilter({ onFilterChange, defaultFilter = "active" }: ProjectFilterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>(defaultFilter);

  useEffect(() => {
    onFilterChange(activeFilter);
  }, [activeFilter, onFilterChange]);

  const handleFilterChange = (value: string) => {
    const newFilter = value as FilterType;
    setActiveFilter(newFilter);
  };

  return (
    <Tabs value={activeFilter} onValueChange={handleFilterChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active">Active Projects</TabsTrigger>
        <TabsTrigger value="finished">Finished Projects</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}