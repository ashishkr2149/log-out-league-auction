'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirectTo'));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setPendingVerify(false);

    try {
      const supabase = createClient();

      if (isSignUp) {
        const name = displayName.trim();
        if (!name) {
          toast.error('Display name is required');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name, display_name: name },
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setPendingVerify(true);
          toast.success('Check your email to verify your account before creating tournaments or auctions');
        } else {
          toast.success('Account created');
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !data.user.email_confirmed_at) {
          toast.message('Email not verified yet', {
            description:
              'You can browse after sign-in, but creating tournaments, teams, or auctions requires a verified email.',
          });
        } else {
          toast.success('Signed in');
        }
        router.push(redirectTo);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/25">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-display text-2xl font-semibold text-foreground">
          Log Out League
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isSignUp
            ? 'Create your account — verify email before creating content'
            : 'Sign in to jump into auctions and teams'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingVerify && (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            We sent a confirmation link to <span className="font-medium">{email}</span>.
            Verify that address before creating tournaments, teams, players, or auctions.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="rounded-full"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded-full"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md border-border bg-card">
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
