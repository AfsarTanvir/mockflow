'use client';

import { useRef, useState } from 'react';
import { Link as LinkIcon, Trash2, Upload } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

/**
 * Reusable avatar editor: shows the current image (or initials), lets the user
 * upload a file OR paste an image URL, and remove the current avatar. Purely
 * presentational — the parent owns the mutations via the callbacks.
 */
export function AvatarUploader({
  currentUrl,
  name,
  isPending = false,
  onUploadFile,
  onSetUrl,
  onRemove,
  className,
}: {
  currentUrl: string | null;
  name: string;
  isPending?: boolean;
  onUploadFile: (file: File) => void;
  onSetUrl: (url: string) => void;
  onRemove: () => void;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 2MB or smaller.');
      return;
    }
    setError(null);
    onUploadFile(file);
  }

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start', className)}>
      <Avatar className="size-16 shrink-0">
        <AvatarImage src={currentUrl ?? undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
          {initials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Upload image
          </Button>
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setError(null);
                onRemove();
              }}
              className="text-destructive focus-visible:text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <LinkIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="…or paste an image URL"
              className="pl-8"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || !url.trim()}
            onClick={() => {
              setError(null);
              onSetUrl(url.trim());
              setUrl('');
            }}
          >
            Save URL
          </Button>
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}
        <p className="text-muted-foreground text-xs">PNG, JPG, WEBP or GIF, up to 2MB.</p>
      </div>
    </div>
  );
}
