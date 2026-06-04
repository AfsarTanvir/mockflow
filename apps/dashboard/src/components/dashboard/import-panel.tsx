'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { previewOpenApi, applyOpenApi, previewPostman, applyPostman } from '@/services/import';
import type { PreviewResult } from '@/services/import';
import { QueryKey } from '@/types/query-key.enum';

type ImportFormat = 'openapi' | 'postman';

interface Props {
  projectId: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-primary/10 text-primary',
  POST: 'bg-success/10 text-success',
  PUT: 'bg-warning/10 text-warning',
  PATCH: 'bg-warning/10 text-warning',
  DELETE: 'bg-destructive/10 text-destructive',
};

const FORMATS: { value: ImportFormat; label: string }[] = [
  { value: 'openapi', label: 'OpenAPI 3.0' },
  { value: 'postman', label: 'Postman v2.1' },
];

export function ImportPanel({ projectId }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<ImportFormat>('openapi');
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, 'skip' | 'overwrite'>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setResolutions({});
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFormatChange(f: ImportFormat) {
    setFormat(f);
    reset();
  }

  async function handlePreview() {
    if (!file) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setSuccess(null);
    try {
      const result =
        format === 'openapi'
          ? await previewOpenApi(projectId, file)
          : await previewPostman(projectId, file);
      setPreview(result);
      const defaultResolutions: Record<string, 'skip' | 'overwrite'> = {};
      for (const c of result.conflicts) {
        defaultResolutions[`${c.method} ${c.path}`] = 'skip';
      }
      setResolutions(defaultResolutions);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to parse the file. Please check the format.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApply() {
    if (!preview) return;
    setApplying(true);
    setError(null);
    try {
      const result =
        format === 'openapi'
          ? await applyOpenApi(projectId, preview.endpoints, resolutions)
          : await applyPostman(projectId, preview.endpoints, resolutions);
      setSuccess(
        `Imported successfully — created ${result.created}, overwrote ${result.overwritten}, skipped ${result.skipped}.`
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENDPOINTS, projectId] });
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Import failed. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  const newCount = preview ? preview.endpoints.length - preview.conflicts.length : 0;

  return (
    <div className="bg-card rounded-xl border p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Import</h2>
      <p className="text-xs text-muted-foreground">
        Import endpoints from an OpenAPI 3.0 or Postman v2.1 JSON file. Existing endpoints with the
        same method + path will be flagged as conflicts.
      </p>

      {/* Format selector */}
      <div className="flex gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleFormatChange(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              format === f.value
                ? 'bg-primary text-primary-foreground border-border'
                : 'bg-card text-muted-foreground border-input hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* File picker row */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setError(null);
            setSuccess(null);
          }}
          className="flex-1 text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:text-xs file:font-medium file:bg-card file:text-foreground file:cursor-pointer hover:file:bg-muted"
        />
        <button
          type="button"
          disabled={!file || previewing}
          onClick={handlePreview}
          className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {previewing ? 'Parsing…' : 'Preview'}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Success */}
      {success && <p className="text-xs text-success">{success}</p>}

      {/* Preview results */}
      {preview && (
        <div className="space-y-3 border-t pt-4">
          {/* Summary */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{newCount}</span> to create
            </span>
            <span>
              <span className="font-semibold text-foreground">{preview.conflicts.length}</span>{' '}
              conflict{preview.conflicts.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 space-y-1">
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-xs text-warning">
                  {w}
                </p>
              ))}
            </div>
          )}

          {/* Conflicts table */}
          {preview.conflicts.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted border-b">
                <p className="text-xs font-medium text-muted-foreground">
                  Choose how to handle each conflict
                </p>
              </div>
              <div className="divide-y">
                {preview.conflicts.map((c) => {
                  const key = `${c.method} ${c.path}`;
                  return (
                    <div key={key} className="flex items-center gap-3 px-3 py-2.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${METHOD_COLORS[c.method] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {c.method}
                      </span>
                      <span className="flex-1 text-xs font-mono text-foreground truncate">
                        {c.path}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          value="skip"
                          checked={resolutions[key] === 'skip'}
                          onChange={() => setResolutions((r) => ({ ...r, [key]: 'skip' }))}
                          className="accent-primary"
                        />
                        Skip
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="radio"
                          name={key}
                          value="overwrite"
                          checked={resolutions[key] === 'overwrite'}
                          onChange={() => setResolutions((r) => ({ ...r, [key]: 'overwrite' }))}
                          className="accent-primary"
                        />
                        Overwrite
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={applying}
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {applying ? 'Importing…' : `Confirm import (${preview.endpoints.length} endpoints)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
