'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, Check, Eye, EyeOff, Ban } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateOverlayCredentialAction,
  revokeOverlayCredentialAction,
} from '@/app/(dashboard)/dashboard/auctions/actions';

export type OverlayCredentialRow = {
  id: string;
  label: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
};

interface Props {
  auctionId: string;
  credentials: OverlayCredentialRow[];
  appUrl: string;
}

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days (default)' },
  { value: '90', label: '90 days' },
  { value: 'never', label: 'Never expires' },
] as const;

function formatUtc(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export function OverlayCredentialsManager({ auctionId, credentials, appUrl }: Props) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [label, setLabel] = useState('OBS Browser Source');
  const [expiryDays, setExpiryDays] = useState('30');
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      let expiresAt: string | null | undefined;
      if (expiryDays === 'never') {
        expiresAt = null;
      } else {
        const days = Number(expiryDays);
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const result = await generateOverlayCredentialAction(
        auctionId,
        label.trim() || 'OBS Browser Source',
        expiresAt
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOverlayUrl(result.overlayUrl ?? null);
      setRevealed(true);
      toast.success('Overlay credential generated — copy the URL now; it will not be shown again.');
      router.refresh();
    } catch {
      toast.error('Failed to generate overlay credential');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRevoke(credentialId: string) {
    setRevokingId(credentialId);
    try {
      const result = await revokeOverlayCredentialAction(credentialId, auctionId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Overlay link revoked');
      router.refresh();
    } catch {
      toast.error('Failed to revoke overlay credential');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopy() {
    if (!overlayUrl) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      toast.success('Overlay URL copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy URL');
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="overlay-label" className="text-muted-foreground">
          Credential Label
        </Label>
        <Input
          id="overlay-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="OBS Browser Source"
          className="border-border bg-muted text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="overlay-expiry" className="text-muted-foreground">
          Link expiry
        </Label>
        <select
          id="overlay-expiry"
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
          className="flex h-9 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground"
        >
          {EXPIRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          'Generate Overlay URL'
        )}
      </Button>

      {overlayUrl && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 space-y-3">
          <p className="text-xs text-amber-300">
            Copy this URL now. The raw token is only shown once for security.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <code className="flex-1 min-w-0 rounded bg-card px-3 py-2 text-xs text-slate-200 font-mono break-all">
              {revealed ? overlayUrl : overlayUrl.replace(/\/overlay\/.+/, '/overlay/••••••••')}
            </code>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-border text-muted-foreground"
                onClick={() => setRevealed((v) => !v)}
                aria-label={revealed ? 'Hide URL' : 'Show URL'}
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-border text-muted-foreground"
                onClick={handleCopy}
                aria-label="Copy URL"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {credentials.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Credential audit
          </p>
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="rounded-lg border border-border bg-muted/60 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{cred.label}</span>
                <Badge
                  variant="outline"
                  className={
                    cred.is_active && !cred.revoked_at
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-red-600 text-primary'
                  }
                >
                  {cred.is_active && !cred.revoked_at ? 'Active' : 'Revoked'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                Created {formatUtc(cred.created_at)}
                {cred.created_by ? ' · by operator' : ''}
              </p>
              <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                {cred.expires_at
                  ? `Expires ${formatUtc(cred.expires_at)}`
                  : 'No expiry'}
                {cred.revoked_at
                  ? ` · Revoked ${formatUtc(cred.revoked_at)}${cred.revoked_by ? ' · by operator' : ''}`
                  : ''}
              </p>
              {cred.is_active && !cred.revoked_at && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-primary hover:bg-destructive/10"
                  disabled={revokingId === cred.id}
                  onClick={() => handleRevoke(cred.id)}
                >
                  {revokingId === cred.id ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-3.5 w-3.5" />
                  )}
                  Revoke link
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground break-all">
        Overlay URL format: {appUrl}/overlay/[token]
      </p>
    </div>
  );
}
