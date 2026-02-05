import React from 'react';
import { ProjectFilters } from '@/lib/types';
import { ProjectStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { getStatusLabel } from '@/lib/project-utils';
import { Filter, X } from 'lucide-react';

interface ProjectFilterProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  className?: string;
}

export function ProjectFilter({ filters, onFiltersChange, className }: ProjectFilterProps) {
  const hasActiveFilters = filters.status || filters.filter;

  const handleFilterChange = (key: keyof ProjectFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                1
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuRadioGroup
            value={filters.status || 'all'}
            onValueChange={(value) => 
              handleFilterChange('status', value === 'all' ? undefined : value)
            }
          >
            <DropdownMenuRadioItem value="all">
              All Statuses
            </DropdownMenuRadioItem>
            {Object.values(ProjectStatus).map((status) => (
              <DropdownMenuRadioItem key={status} value={status}>
                {getStatusLabel(status)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuRadioGroup
            value={filters.filter || 'all'}
            onValueChange={(value) => 
              handleFilterChange('filter', value === 'all' ? undefined : value)
            }
          >
            <DropdownMenuRadioItem value="all">
              All Projects
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="active">
              Active Projects
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="finished">
              Finished Projects
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}