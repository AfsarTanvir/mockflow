'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCompany } from '@/query/companies';
import { setActiveCompanyClient } from '@/lib/active-company';
import { createCompanySchema, type CreateCompanyInput } from '@/schema/companies';
import { Building2, Mail } from 'lucide-react';

type Step = 'choose' | 'create';

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');

  const { mutate: createCompany, isPending, error } = useCreateCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: '', visibility: 'private' },
  });

  function handleCreate(data: CreateCompanyInput) {
    createCompany(data, {
      onSuccess: (res) => {
        setActiveCompanyClient(res.company.slug);
        router.push('/dashboard');
        router.refresh();
      },
    });
  }

  if (step === 'choose') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome to MockFlow</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Let's get you set up. Are you starting a new company or joining one?
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={() => setStep('create')}
              className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left hover:border-ring hover:shadow-sm transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Create a company</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Start a new workspace. You'll be the owner.
                </p>
              </div>
            </button>

            <div
              className="flex flex-col items-start gap-3 rounded-xl border bg-muted p-5 text-left opacity-60 cursor-not-allowed"
              title="Coming soon"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Accept an invite</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Use a token from your team. <span className="font-medium">(Coming soon)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Create your company</h1>
          <p className="text-sm text-muted-foreground mt-2">You can change these settings later.</p>
        </div>

        <form
          onSubmit={handleSubmit(handleCreate)}
          className="space-y-5 rounded-xl border bg-card p-6 shadow-sm"
          noValidate
        >
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {(error as Error).message}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Company name</label>
            <input
              type="text"
              {...register('name')}
              placeholder="Acme Inc."
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.name ? 'border-destructive' : 'border-input'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Visibility</label>
            <select
              {...register('visibility')}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="private">Private — invite only</option>
              <option value="protected">Protected — listed, join by approval</option>
              <option value="public">Public — anyone can join</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              You can change this later in settings.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <button
              type="button"
              onClick={() => setStep('choose')}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Creating…' : 'Create company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
