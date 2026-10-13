'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { generateOverlayCredentialAction } from '@/app/(dashboard)/dashboard/auctions/actions';

interface GenerateOverlayCredentialProps {
  auctionId: string;
}

export function GenerateOverlayCredential({ auctionId }: GenerateOverlayCredentialProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [label, setLabel] = useState('OBS Browser Source');
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const result = await generateOverlayCredentialAction(auctionId, label.trim() || 'OBS Browser Source');
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOverlayUrl(result.overlayUrl ?? null);
      setRevealed(true);
      toast.success('Overlay credential generated — copy the URL now; it will not be shown again.');
    } catch {
      toast.error('Failed to generate overlay credential');
    } finally {
      setIsGenerating(false);
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
        <Label htmlFor="overlay-label" className="text-slate-300">
          Credential Label
        </Label>
        <Input
          id="overlay-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="OBS Browser Source"
          className="border-slate-700 bg-slate-800 text-white"
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
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
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-slate-900 px-3 py-2 text-xs text-slate-200 font-mono break-all">
              {revealed ? overlayUrl : overlayUrl.replace(/\/overlay\/.+/, '/overlay/••••••••')}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-slate-700 text-slate-300 shrink-0"
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-slate-700 text-slate-300 shrink-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
