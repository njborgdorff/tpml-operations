import { Button } from '@/components/ui/button';

interface ProjectFilterTabsProps {
  activeView: 'active' | 'finished';
  onViewChange: (view: 'active' | 'finished') => void;
  activeCounts?: {
    active: number;
    finished: number;
  };
}

export function ProjectFilterTabs({ 
  activeView, 
  onViewChange, 
  activeCounts 
}: ProjectFilterTabsProps) {
  return (
    <div className="flex space-x-1 rounded-lg bg-muted p-1">
      <Button
        variant={activeView === 'active' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('active')}
        className="relative"
      >
        Active Projects
        {activeCounts && (
          <span className="ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
            {activeCounts.active}
          </span>
        )}
      </Button>
      <Button
        variant={activeView === 'finished' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('finished')}
        className="relative"
      >
        Finished Projects
        {activeCounts && (
          <span className="ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
            {activeCounts.finished}
          </span>
        )}
      </Button>
    </div>
  );
}