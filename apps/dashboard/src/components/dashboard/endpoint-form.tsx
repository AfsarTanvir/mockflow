'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react';
import { createEndpointSchema, type CreateEndpointInput } from '@/schema/endpoints';
import type { Endpoint } from '@/types';
import { JsonEditor } from './json-editor';
import { HeadersEditor } from './headers-editor';
import { DelaySlider } from './delay-slider';
import { cn } from '@/lib/utils';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const STATUS_OPTIONS = [200, 201, 204, 400, 401, 403, 404, 409, 422, 500];

export type EndpointFormPayload = CreateEndpointInput & {
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
};

type EndpointFormProps = {
  mode: 'create' | 'edit';
  initialValues?: Endpoint;
  onSubmit: (data: EndpointFormPayload) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: Error | null;
};

function toJsonString(body: Record<string, unknown> | null): string {
  if (!body) return '{\n  \n}';
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return '{\n  \n}';
  }
}

function parseJson(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function EndpointForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  error,
}: EndpointFormProps) {
  const [responseBodyText, setResponseBodyText] = useState(
    toJsonString(initialValues?.responseBody ?? null)
  );
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>(
    initialValues?.responseHeaders ?? {}
  );
  const [showHeaders, setShowHeaders] = useState(
    Object.keys(initialValues?.responseHeaders ?? {}).length > 0
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateEndpointInput>({
    resolver: zodResolver(createEndpointSchema),
    defaultValues: {
      method: initialValues?.method ?? 'GET',
      path: initialValues?.path ?? '',
      statusCode: initialValues?.statusCode ?? 200,
      delayMs: initialValues?.delayMs ?? 0,
      isActive: initialValues?.isActive ?? true,
    },
  });

  function handleFormSubmit(data: CreateEndpointInput) {
    onSubmit({
      ...data,
      responseBody: parseJson(responseBodyText),
      responseHeaders,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error.message}</div>
      )}

      {/* Row 1: Method + Path + Status */}
      <div className="flex gap-3">
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
          <select
            {...register('method')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Path</label>
          <input
            type="text"
            {...register('path')}
            className={cn(
              'w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.path ? 'border-red-400' : 'border-gray-300'
            )}
            placeholder="/users/:id"
          />
          {errors.path && <p className="mt-1 text-xs text-red-500">{errors.path.message}</p>}
        </div>

        <div className="w-24">
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            {...register('statusCode')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Delay Slider */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Delay</label>
        <Controller
          control={control}
          name="delayMs"
          render={({ field }) => <DelaySlider value={field.value ?? 0} onChange={field.onChange} />}
        />
      </div>

      {/* Row 3: Response Body */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Response Body</label>
        <JsonEditor value={responseBodyText} onChange={setResponseBodyText} />
      </div>

      {/* Row 4: Headers (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowHeaders((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', showHeaders && 'rotate-180')}
          />
          Response Headers
          {Object.keys(responseHeaders).length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {Object.keys(responseHeaders).length}
            </span>
          )}
        </button>

        {showHeaders && (
          <div className="mt-3">
            <HeadersEditor value={responseHeaders} onChange={setResponseHeaders} />
          </div>
        )}
      </div>

      {/* Row 5: Active toggle + Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isActive')}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create Endpoint'
                : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
