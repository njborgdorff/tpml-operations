'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectFilterProps {
  value: 'ALL' | 'ACTIVE' | 'FINISHED';
  onValueChange: (value: 'ALL' | 'ACTIVE' | 'FINISHED') => void;
  className?: string;
}

export function ProjectFilter({ value, onValueChange, className }: ProjectFilterProps) {
  const filterOptions = [
    { value: 'ALL', label: 'All Projects' },
    { value: 'ACTIVE', label: 'Active Projects' },
    { value: 'FINISHED', label: 'Finished Projects' }
  ];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          {filterOptions.find(option => option.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {filterOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}