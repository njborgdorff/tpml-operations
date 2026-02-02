'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
// Badge imported for future use in workflow status display
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Code,
  Search,
  TestTube,
  UserCheck,
} from 'lucide-react';

type WorkflowStatus =
  | 'IMPLEMENTING'
  | 'REVIEWING'
  | 'TESTING'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED';

type WorkflowRole = 'Implementer' | 'Reviewer' | 'QA' | 'PM';

interface ReviewWorkflowProps {
  projectId: string;
  sprintId: string;
  currentStatus: WorkflowStatus;
}

const workflowSteps: {
  status: WorkflowStatus;
  role: WorkflowRole;
  label: string;
  icon: React.ReactNode;
}[] = [
  { status: 'IMPLEMENTING', role: 'Implementer', label: 'Implementation', icon: <Code className="h-5 w-5" /> },
  { status: 'REVIEWING', role: 'Reviewer', label: 'Code Review', icon: <Search className="h-5 w-5" /> },
  { status: 'TESTING', role: 'QA', label: 'QA Testing', icon: <TestTube className="h-5 w-5" /> },
  { status: 'AWAITING_APPROVAL', role: 'PM', label: 'Acceptance', icon: <UserCheck className="h-5 w-5" /> },
  { status: 'COMPLETED', role: 'PM', label: 'Complete', icon: <CheckCircle className="h-5 w-5" /> },
];

const statusIndex = (status: WorkflowStatus): number => {
  return workflowSteps.findIndex((s) => s.status === status);
};

export function ReviewWorkflow({
  projectId,
  sprintId,
  currentStatus,
}: ReviewWorkflowProps) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);

  const currentIndex = statusIndex(currentStatus);
  const currentStep = workflowSteps[currentIndex];

  const handleTransition = async (
    toStatus: WorkflowStatus,
    toRole: WorkflowRole,
    decision: string
  ) => {
    setIsTransitioning(true);
    try {
      const response = await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sprintId,
          fromStatus: currentStatus,
          toStatus,
          fromRole: currentStep.role,
          toRole,
          decision,
          summary: `${currentStep.role} ${decision.toLowerCase().replace('_', ' ')} - transitioning to ${toRole}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transition failed');
      }

      toast.success(`Transitioned to ${toRole}!`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transition failed');
    } finally {
      setIsTransitioning(false);
      setSelectedDecision(null);
    }
  };

  const getTransitionOptions = (): {
    label: string;
    decision: string;
    toStatus: WorkflowStatus;
    toRole: WorkflowRole;
    variant: 'default' | 'destructive' | 'outline';
    icon: React.ReactNode;
  }[] => {
    switch (currentStatus) {
      case 'IMPLEMENTING':
        return [
          {
            label: 'Submit for Review',
            decision: 'APPROVE',
            toStatus: 'REVIEWING',
            toRole: 'Reviewer',
            variant: 'default',
            icon: <ArrowRight className="h-4 w-4" />,
          },
        ];
      case 'REVIEWING':
        return [
          {
            label: 'Approve → QA',
            decision: 'APPROVE',
            toStatus: 'TESTING',
            toRole: 'QA',
            variant: 'default',
            icon: <CheckCircle className="h-4 w-4" />,
          },
          {
            label: 'Request Changes',
            decision: 'REQUEST_CHANGES',
            toStatus: 'IMPLEMENTING',
            toRole: 'Implementer',
            variant: 'outline',
            icon: <AlertTriangle className="h-4 w-4" />,
          },
        ];
      case 'TESTING':
        return [
          {
            label: 'QA Passed → PM',
            decision: 'ACCEPT',
            toStatus: 'AWAITING_APPROVAL',
            toRole: 'PM',
            variant: 'default',
            icon: <CheckCircle className="h-4 w-4" />,
          },
          {
            label: 'Bugs Found',
            decision: 'FIX_REQUIRED',
            toStatus: 'IMPLEMENTING',
            toRole: 'Implementer',
            variant: 'outline',
            icon: <XCircle className="h-4 w-4" />,
          },
        ];
      case 'AWAITING_APPROVAL':
        return [
          {
            label: 'Accept Feature',
            decision: 'ACCEPT',
            toStatus: 'COMPLETED',
            toRole: 'PM',
            variant: 'default',
            icon: <CheckCircle className="h-4 w-4" />,
          },
          {
            label: 'Reject',
            decision: 'REJECT',
            toStatus: 'IMPLEMENTING',
            toRole: 'Implementer',
            variant: 'destructive',
            icon: <XCircle className="h-4 w-4" />,
          },
        ];
      default:
        return [];
    }
  };

  const options = getTransitionOptions();

  if (currentStatus === 'COMPLETED') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Sprint Complete
          </CardTitle>
          <CardDescription>
            All workflow stages completed successfully.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Workflow</CardTitle>
        <CardDescription>
          Current stage: {currentStep.label} ({currentStep.role})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {workflowSteps.slice(0, -1).map((step, index) => {
            const isActive = index === currentIndex;
            const isComplete = index < currentIndex;
            const _isFuture = index > currentIndex; // Used for future styling

            return (
              <div key={step.status} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    isComplete
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : isActive
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                {index < workflowSteps.length - 2 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      isComplete ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between text-xs">
          {workflowSteps.slice(0, -1).map((step, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={step.status}
                className={`text-center w-20 ${
                  isActive ? 'font-semibold text-blue-700' : 'text-muted-foreground'
                }`}
              >
                <div>{step.label}</div>
                <div className="text-muted-foreground">{step.role}</div>
              </div>
            );
          })}
        </div>

        {/* Transition Actions */}
        {options.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">
              {currentStep.role} Actions:
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <Button
                  key={option.decision}
                  variant={option.variant}
                  onClick={() =>
                    handleTransition(
                      option.toStatus,
                      option.toRole,
                      option.decision
                    )
                  }
                  disabled={isTransitioning}
                >
                  {isTransitioning && selectedDecision === option.decision ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <span className="mr-2">{option.icon}</span>
                  )}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
