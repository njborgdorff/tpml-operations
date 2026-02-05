'use client';

import { Button } from '@/components/ui/button';

interface ProjectFilterProps {
  activeFilter: 'active' | 'finished';
  onFilterChange: (filter: 'active' | 'finished') => void;
  activeCounts: {
    active: number;
    finished: number;
  };
}

export function ProjectFilter({ activeFilter, onFilterChange, activeCounts }: ProjectFilterProps) {
  return (
    <div className="flex space-x-2">
      <Button
        variant={activeFilter === 'active' ? 'default' : 'outline'}
        onClick={() => onFilterChange('active')}
        className="flex items-center gap-2"
      >
        Active Projects
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
          {activeCounts.active}
        </span>
      </Button>
      <Button
        variant={activeFilter === 'finished' ? 'default' : 'outline'}
        onClick={() => onFilterChange('finished')}
        className="flex items-center gap-2"
      >
        Finished Projects
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
          {activeCounts.finished}
        </span>
      </Button>
    </div>
  );
}