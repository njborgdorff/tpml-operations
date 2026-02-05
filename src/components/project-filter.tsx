'use client';

import { ProjectFilter } from '@/types/project';
import { Button } from '@/components/ui/button';

interface ProjectFilterProps {
  currentFilter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
  projectCounts: {
    all: number;
    active: number;
    finished: number;
  };
}

export function ProjectFilterComponent({ 
  currentFilter, 
  onFilterChange, 
  projectCounts 
}: ProjectFilterProps) {
  const filters: { key: ProjectFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Projects', count: projectCounts.all },
    { key: 'active', label: 'Active', count: projectCounts.active },
    { key: 'finished', label: 'Finished', count: projectCounts.finished },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={currentFilter === filter.key ? 'default' : 'outline'}
          onClick={() => onFilterChange(filter.key)}
          className="flex items-center gap-2"
        >
          {filter.label}
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {filter.count}
          </span>
        </Button>
      ))}
    </div>
  );
}