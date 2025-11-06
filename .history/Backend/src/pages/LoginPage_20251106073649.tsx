import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { LockKeyhole, Mail, LogIn } from 'lucide-react';
import { authenticateAdmin } from '@/lib/pocketbase';
import { useTheme } from '@/components/theme/theme-provider';



const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    const existingScript = document.getElementById('dotlottie-wc-script');
    if (existingScript) return;
    const script = document.createElement('script');
    script.id = 'dotlottie-wc-script';
    script.type = 'module';
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js';
    document.head.appendChild(script);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await authenticateAdmin(email, password);
      
      toast({
        title: 'Login Successful',
        description: 'Welcome to Zenthra Shop',
      });
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${
        theme === 'dark'
          ? 'from-slate-950 via-slate-900 to-slate-800'
          : 'from-slate-50 via-white to-sky-50'
      } px-6 py-10 flex items-center justify-center`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 rounded-3xl border border-border/60 bg-card/70 p-8 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl md:flex-row md:p-12">
        <div className="flex w-full flex-col justify-between gap-12 md:w-1/2">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Zenthra Shop logo"
                className="h-20 w-auto drop-shadow-[0_18px_46px_rgba(59,130,246,0.35)]"
                loading="eager"
              />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Unlock your commerce command centre
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                Sign in to manage automations, fulfil orders, and deliver delightful customer experiences from one sleek dashboard.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent p-6 text-sm text-primary-foreground shadow-[0_35px_80px_-40px_rgba(59,130,246,0.75)]">
              <div className="pointer-events-none absolute -top-12 right-[-30%] h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
              <p className="font-semibold uppercase tracking-[0.35em] text-[10px] text-primary-foreground/80">Release highlights</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-foreground/90"></span>
                  Evolution journeys with personalised fallback recipients
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-foreground/90"></span>
                  Real-time activity previews and enriched context
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-foreground/90"></span>
                  Refreshed admin canvas with faster navigation
                </li>
              </ul>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            Systems operational • Updated {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        </div>

        <div className="flex w-full flex-col justify-center md:w-1/2">
          <Card className="w-full border border-border/60 bg-background/90 shadow-2xl">
            <CardHeader className="items-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                  Welcome back
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wide text-muted-foreground">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="founder@zenthra.shop"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 rounded-xl border-border pl-10 text-sm backdrop-blur focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      <Label htmlFor="password">Password</Label>
                      <a
                        href="#"
                        className="text-primary transition-colors hover:text-primary/80"
                      >
                        Need help?
                      </a>
                    </div>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-xl border-border pl-10 text-sm backdrop-blur focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <svg
                        className="-ml-1 mr-1 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Checking credentials…
                    </div>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Secure sign-in
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Separator className="bg-border/80" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>© {new Date().getFullYear()} Zenthra Shop</span>
                <span>Made for operators · Build {new Date().toLocaleString(undefined, { month: 'short', year: 'numeric' })}</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
