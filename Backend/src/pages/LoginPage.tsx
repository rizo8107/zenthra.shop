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
import { debugEnvironment } from '@/utils/env-debug';



const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    // Debug environment variables on component mount
    debugEnvironment();
    
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
      <Card className="w-full max-w-md border border-border/60 bg-background/90 shadow-2xl">
        <CardHeader className="items-center space-y-4 text-center">
          <img
            src="/logo.svg"
            alt="Zenthra Shop logo"
            className="h-16 w-auto drop-shadow-[0_18px_46px_rgba(59,130,246,0.35)]"
            loading="eager"
          />
          <CardTitle className="text-xl">Sign in</CardTitle>
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
          <div className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Zenthra Shop
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
