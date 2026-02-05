'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type FilterType = 'all' | 'active' | 'finished';

interface ProjectFilterProps {
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  projectCounts?: {
    all: number;
    active: number;
    finished: number;
  };
}

export function ProjectFilter({ 
  currentFilter, 
  onFilterChange, 
  projectCounts 
}: ProjectFilterProps) {
  const filters: { key: FilterType; label: string; description: string }[] = [
    { 
      key: 'all', 
      label: 'All Projects', 
      description: 'View all projects regardless of status' 
    },
    { 
      key: 'active', 
      label: 'Active Projects', 
      description: 'Projects that are In Progress or Complete' 
    },
    { 
      key: 'finished', 
      label: 'Finished Projects', 
      description: 'Projects that have been archived' 
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          variant={currentFilter === filter.key ? 'default' : 'outline'}
          className="flex flex-col items-center gap-1 h-auto p-3"
        >
          <span className="font-medium">{filter.label}</span>
          {projectCounts && (
            <span className="text-xs opacity-70">
              ({projectCounts[filter.key]} projects)
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}