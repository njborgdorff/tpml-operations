'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { IntakeSchema, IntakeData, ProjectType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface Codebase {
  name: string;
  displayName: string;
  client: string;
  status: string;
  hasClaudeMd: boolean;
  hasSrc: boolean;
}

interface IntakeFormProps {
  clients: Client[];
}

// Helper type for error messages in discriminated unions
type FormErrors = Record<string, { message?: string } | undefined>;

export function IntakeForm({ clients }: IntakeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codebases, setCodebases] = useState<Codebase[]>([]);
  const [projectType, setProjectType] = useState<ProjectType>('NEW_PROJECT');

  // Fetch available codebases on mount
  useEffect(() => {
    fetch('/api/codebases')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCodebases(data);
        }
      })
      .catch(err => console.error('Failed to fetch codebases:', err));
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: rawErrors },
  } = useForm<IntakeData>({
    resolver: zodResolver(IntakeSchema),
    defaultValues: {
      projectType: 'NEW_PROJECT',
    },
  });

  // Cast errors to allow accessing fields from all variants of the discriminated union
  const errors = rawErrors as FormErrors;

  // Handle project type change
  const handleProjectTypeChange = (value: ProjectType) => {
    setProjectType(value);
    setValue('projectType', value);
  };

  // Handle codebase selection
  const handleCodebaseChange = (value: string) => {
    setValue('targetCodebase', value === 'new' ? undefined : value);
  };

  const onSubmit = async (data: IntakeData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }

      const project = await response.json();

      const successMessage = projectType === 'BUG_FIX'
        ? `Bug fix "${project.name}" created! The AI team will analyze and fix this.`
        : projectType === 'NEW_FEATURE'
        ? `Feature "${project.name}" created! The AI team is planning the implementation.`
        : `Project "${project.name}" created! The AI team is generating your plan.`;

      toast.success(successMessage);
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Project Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>What type of work is this?</CardTitle>
          <CardDescription>
            This determines the workflow and information needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleProjectTypeChange('NEW_PROJECT')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                projectType === 'NEW_PROJECT'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">New Project</div>
              <div className="text-sm text-muted-foreground">
                Brand new application from scratch
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleProjectTypeChange('NEW_FEATURE')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                projectType === 'NEW_FEATURE'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">New Feature</div>
              <div className="text-sm text-muted-foreground">
                Add feature to existing project
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleProjectTypeChange('BUG_FIX')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                projectType === 'BUG_FIX'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">Bug Fix</div>
              <div className="text-sm text-muted-foreground">
                Fix an issue in existing code
              </div>
            </button>
          </div>
          <input type="hidden" {...register('projectType')} />
        </CardContent>
      </Card>

      {/* Basic Info - All project types */}
      <Card>
        <CardHeader>
          <CardTitle>
            {projectType === 'BUG_FIX' ? 'Bug Details' : projectType === 'NEW_FEATURE' ? 'Feature Details' : 'Project Basics'}
          </CardTitle>
          <CardDescription>
            {projectType === 'BUG_FIX'
              ? 'Tell us about the bug you need fixed'
              : projectType === 'NEW_FEATURE'
              ? 'Tell us about the feature you want to add'
              : 'Tell us about your project at a high level'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {projectType === 'BUG_FIX' ? 'Bug Title' : projectType === 'NEW_FEATURE' ? 'Feature Name' : 'Project Name'}
            </Label>
            <Input
              id="name"
              placeholder={
                projectType === 'BUG_FIX'
                  ? 'e.g., Login button not responding'
                  : projectType === 'NEW_FEATURE'
                  ? 'e.g., Dark Mode Toggle'
                  : 'e.g., Customer Portal'
              }
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Input
              id="client"
              placeholder="e.g., ACME Corp"
              list="clients"
              {...register('client')}
            />
            <datalist id="clients">
              {clients.map((client) => (
                <option key={client.id} value={client.name} />
              ))}
            </datalist>
            {errors.client && (
              <p className="text-sm text-destructive">{errors.client.message}</p>
            )}
          </div>

          {/* Target Codebase - Required for NEW_FEATURE and BUG_FIX */}
          {(projectType === 'NEW_FEATURE' || projectType === 'BUG_FIX') && (
            <div className="space-y-2">
              <Label htmlFor="targetCodebase">Target Codebase *</Label>
              <Select onValueChange={handleCodebaseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the project to work on" />
                </SelectTrigger>
                <SelectContent>
                  {codebases.map((codebase) => (
                    <SelectItem key={codebase.name} value={codebase.name}>
                      {codebase.displayName} ({codebase.client})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The existing project where this {projectType === 'BUG_FIX' ? 'bug exists' : 'feature will be added'}
              </p>
              {errors.targetCodebase && (
                <p className="text-sm text-destructive">{errors.targetCodebase.message}</p>
              )}
            </div>
          )}

          {/* Optional target codebase for NEW_PROJECT */}
          {projectType === 'NEW_PROJECT' && (
            <div className="space-y-2">
              <Label htmlFor="targetCodebase">Target Codebase (Optional)</Label>
              <Select onValueChange={handleCodebaseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="New project (create fresh repo)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New project (create fresh repo)</SelectItem>
                  {codebases.map((codebase) => (
                    <SelectItem key={codebase.name} value={codebase.name}>
                      {codebase.displayName} ({codebase.client})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Leave as default to create a new repository
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BUG_FIX specific fields */}
      {projectType === 'BUG_FIX' && (
        <Card>
          <CardHeader>
            <CardTitle>Bug Information</CardTitle>
            <CardDescription>
              Help us understand and reproduce the issue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bugDescription">Bug Description *</Label>
              <Textarea
                id="bugDescription"
                placeholder="Describe what's broken and what you expected to happen..."
                rows={4}
                {...register('bugDescription')}
              />
              {errors.bugDescription && (
                <p className="text-sm text-destructive">{errors.bugDescription.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stepsToReproduce">Steps to Reproduce (Optional)</Label>
              <Textarea
                id="stepsToReproduce"
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                rows={4}
                {...register('stepsToReproduce')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedBehavior">Expected Behavior (Optional)</Label>
              <Input
                id="expectedBehavior"
                placeholder="What should happen instead?"
                {...register('expectedBehavior')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* NEW_FEATURE specific fields */}
      {projectType === 'NEW_FEATURE' && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Details</CardTitle>
            <CardDescription>
              Describe the feature you want to add
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="featureDescription">Feature Description *</Label>
              <Textarea
                id="featureDescription"
                placeholder="Describe what you want this feature to do..."
                rows={4}
                {...register('featureDescription')}
              />
              {errors.featureDescription && (
                <p className="text-sm text-destructive">{errors.featureDescription.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="acceptanceCriteria">Acceptance Criteria *</Label>
              <Textarea
                id="acceptanceCriteria"
                placeholder="How will we know this feature is complete? List the requirements..."
                rows={4}
                {...register('acceptanceCriteria')}
              />
              {errors.acceptanceCriteria && (
                <p className="text-sm text-destructive">{errors.acceptanceCriteria.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Timeline (Optional)</Label>
              <Input
                id="timeline"
                placeholder="e.g., Need by end of week"
                {...register('timeline')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* NEW_PROJECT specific fields */}
      {projectType === 'NEW_PROJECT' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Problem & Users</CardTitle>
              <CardDescription>
                What problem are we solving and for whom?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="problemStatement">What business problem does this solve? *</Label>
                <Textarea
                  id="problemStatement"
                  placeholder="Describe the problem your users face and why it matters..."
                  rows={4}
                  {...register('problemStatement')}
                />
                {errors.problemStatement && (
                  <p className="text-sm text-destructive">{errors.problemStatement.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetUsers">Who are the target users? *</Label>
                <Textarea
                  id="targetUsers"
                  placeholder="Describe who will use this and their roles..."
                  rows={3}
                  {...register('targetUsers')}
                />
                {errors.targetUsers && (
                  <p className="text-sm text-destructive">{errors.targetUsers.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflows & Success</CardTitle>
              <CardDescription>
                What should users be able to do, and how will we know it works?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyWorkflows">What are the key workflows? *</Label>
                <Textarea
                  id="keyWorkflows"
                  placeholder="Describe in plain English, e.g., 'customers place orders, admin approves accounts'..."
                  rows={4}
                  {...register('keyWorkflows')}
                />
                {errors.keyWorkflows && (
                  <p className="text-sm text-destructive">{errors.keyWorkflows.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="successCriteria">What does success look like? *</Label>
                <Textarea
                  id="successCriteria"
                  placeholder="How will you know the project is successful?"
                  rows={3}
                  {...register('successCriteria')}
                />
                {errors.successCriteria && (
                  <p className="text-sm text-destructive">{errors.successCriteria.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constraints (Optional)</CardTitle>
              <CardDescription>
                Any timeline, budget, or technical constraints?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  placeholder="e.g., Need MVP in 6 weeks"
                  {...register('timeline')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  placeholder="e.g., Under $10k"
                  {...register('budget')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraints">Other Constraints</Label>
                <Textarea
                  id="constraints"
                  placeholder="Any other requirements or limitations?"
                  rows={2}
                  {...register('constraints')}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting
            ? 'Creating...'
            : projectType === 'BUG_FIX'
            ? 'Submit Bug Fix'
            : projectType === 'NEW_FEATURE'
            ? 'Create Feature Request'
            : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
