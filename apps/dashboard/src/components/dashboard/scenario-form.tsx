'use client';

import { useState } from 'react';
import { JsonEditor } from './json-editor';
import { HeadersEditor } from './headers-editor';
import { DelaySlider } from './delay-slider';
import type { Scenario, ScenarioInput } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 503];

type Props = {
  mode: 'create' | 'edit';
  initialValues?: Scenario;
  onSubmit: (data: ScenarioInput) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: Error | null;
};

function toJsonString(body: Record<string, unknown> | null | undefined): string {
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

export function ScenarioForm({ mode, initialValues, onSubmit, onCancel, isPending, error }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [priority, setPriority] = useState<number>(initialValues?.priority ?? 0);

  // Each overridable field has an enabled toggle — disabled = inherit (null)
  const [overrideStatus, setOverrideStatus] = useState(initialValues?.statusCode != null);
  const [statusCode, setStatusCode] = useState<number>(initialValues?.statusCode ?? 200);

  const [overrideBody, setOverrideBody] = useState(initialValues?.responseBody != null);
  const [responseBodyText, setResponseBodyText] = useState(
    toJsonString(initialValues?.responseBody)
  );

  const [overrideHeaders, setOverrideHeaders] = useState(initialValues?.responseHeaders != null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>(
    initialValues?.responseHeaders ?? {}
  );

  const [overrideDelay, setOverrideDelay] = useState(initialValues?.delayMs != null);
  const [delayMs, setDelayMs] = useState<number>(initialValues?.delayMs ?? 0);
  const [randomize, setRandomize] = useState(initialValues?.delayMaxMs != null);
  const [delayMaxMs, setDelayMaxMs] = useState<number>(initialValues?.delayMaxMs ?? 200);

  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Name is required');
      return;
    }
    const hasOverride = overrideStatus || overrideBody || overrideHeaders || overrideDelay;
    if (!hasOverride) {
      setLocalError('Scenario must override at least one field');
      return;
    }
    if (overrideDelay && randomize && delayMaxMs < delayMs) {
      setLocalError('Max delay must be >= min delay');
      return;
    }

    const payload: ScenarioInput = {
      name: name.trim(),
      description: description.trim() || null,
      statusCode: overrideStatus ? statusCode : null,
      responseBody: overrideBody ? parseJson(responseBodyText) : null,
      responseHeaders: overrideHeaders ? responseHeaders : null,
      delayMs: overrideDelay ? delayMs : null,
      delayMaxMs: overrideDelay && randomize ? delayMaxMs : null,
      priority,
    };

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {(error || localError) && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {localError ?? error?.message}
        </div>
      )}

      {/* Name + Priority */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. not-found, rate-limited"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            min={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description (optional)
        </label>
        <input
          type="text"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="When does this scenario apply?"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs text-gray-500">
          Tick to override the endpoint default — unticked fields inherit from the endpoint.
        </p>

        {/* Status code */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-xs font-medium text-gray-700">Override status code</span>
          </label>
          {overrideStatus && (
            <select
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className="ml-6 w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Response body */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={overrideBody}
              onChange={(e) => setOverrideBody(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-xs font-medium text-gray-700">Override response body</span>
          </label>
          {overrideBody && (
            <div className="ml-6">
              <JsonEditor value={responseBodyText} onChange={setResponseBodyText} />
            </div>
          )}
        </div>

        {/* Response headers */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={overrideHeaders}
              onChange={(e) => setOverrideHeaders(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-xs font-medium text-gray-700">Override response headers</span>
          </label>
          {overrideHeaders && (
            <div className="ml-6">
              <HeadersEditor value={responseHeaders} onChange={setResponseHeaders} />
            </div>
          )}
        </div>

        {/* Delay */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={overrideDelay}
              onChange={(e) => setOverrideDelay(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <span className="text-xs font-medium text-gray-700">Override delay</span>
          </label>
          {overrideDelay && (
            <div className="ml-6 space-y-3">
              <DelaySlider value={delayMs} onChange={setDelayMs} />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomize}
                  onChange={(e) => setRandomize(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-xs text-gray-700">Randomize between min and max</span>
              </label>

              {randomize && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Max delay (ms)
                  </label>
                  <DelaySlider value={delayMaxMs} onChange={setDelayMaxMs} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
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
          className={cn(
            'px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          )}
        >
          {isPending
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create scenario'
              : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
