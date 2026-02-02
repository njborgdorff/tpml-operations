'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { IntakeSchema, IntakeData } from '@/types';
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

export function IntakeForm({ clients }: IntakeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codebases, setCodebases] = useState<Codebase[]>([]);
  const [selectedCodebase, setSelectedCodebase] = useState<string>('');

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
    formState: { errors },
  } = useForm<IntakeData>({
    resolver: zodResolver(IntakeSchema),
  });

  // Update form value when codebase selection changes
  const handleCodebaseChange = (value: string) => {
    setSelectedCodebase(value);
    setValue('targetCodebase', value === 'new' ? undefined : value);
  };

  const onSubmit = async (data: IntakeData) => {
    setIsSubmitting(true);
    try {
      // Create project
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
      toast.success(`Project "${project.name}" created successfully! The AI team is now generating your plan.`);

      // Return to project listing
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
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project Basics</CardTitle>
          <CardDescription>
            Tell us about your project at a high level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g., Customer Portal"
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

          <div className="space-y-2">
            <Label htmlFor="targetCodebase">Target Codebase</Label>
            <Select value={selectedCodebase} onValueChange={handleCodebaseChange}>
              <SelectTrigger>
                <SelectValue placeholder="New project (create fresh folder)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New project (create fresh folder)</SelectItem>
                {codebases.map((codebase) => (
                  <SelectItem key={codebase.name} value={codebase.name}>
                    {codebase.displayName} ({codebase.client})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              For bug fixes or enhancements, select the existing project folder. For new projects, leave as default.
            </p>
            {errors.targetCodebase && (
              <p className="text-sm text-destructive">{errors.targetCodebase.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Problem & Users */}
      <Card>
        <CardHeader>
          <CardTitle>Problem & Users</CardTitle>
          <CardDescription>
            What problem are we solving and for whom?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="problemStatement">What business problem does this solve?</Label>
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
            <Label htmlFor="targetUsers">Who are the target users?</Label>
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

      {/* Workflows & Success */}
      <Card>
        <CardHeader>
          <CardTitle>Workflows & Success</CardTitle>
          <CardDescription>
            What should users be able to do, and how will we know it works?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyWorkflows">What are the key workflows?</Label>
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
            <Label htmlFor="successCriteria">What does success look like?</Label>
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

      {/* Constraints (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Constraints</CardTitle>
          <CardDescription>
            Optional: Any timeline, budget, or technical constraints?
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
            {errors.timeline && (
              <p className="text-sm text-destructive">{errors.timeline.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              placeholder="e.g., Under $10k"
              {...register('budget')}
            />
            {errors.budget && (
              <p className="text-sm text-destructive">{errors.budget.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="constraints">Other Constraints</Label>
            <Textarea
              id="constraints"
              placeholder="Any other requirements or limitations?"
              rows={2}
              {...register('constraints')}
            />
            {errors.constraints && (
              <p className="text-sm text-destructive">{errors.constraints.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Project...' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
