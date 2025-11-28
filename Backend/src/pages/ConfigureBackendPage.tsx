import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Server, ArrowRight } from 'lucide-react';
import { isNativeApp } from '@/lib/app-config';
import { getPocketBaseUrl as getCurrentPbUrl, updatePocketBaseUrl } from '@/lib/pocketbase';

const ConfigureBackendPage: React.FC = () => {
  const [backendUrl, setBackendUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Load existing URL if any
    const loadConfig = () => {
      try {
        const url = getCurrentPbUrl();
        setBackendUrl(url);
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // If not native app, redirect to login
    if (!isNativeApp()) {
      navigate('/login');
      return;
    }

    loadConfig();
  }, [navigate]);

  const handleSave = async () => {
    if (!backendUrl.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter your backend URL',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL format
    try {
      new URL(backendUrl);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://backend.example.com)',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Test connection to the backend
      const testUrl = `${backendUrl.replace(/\/$/, '')}/api/health`;
      const response = await fetch(testUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error('Backend not reachable');
      }

      // Save the URL
      await updatePocketBaseUrl(backendUrl);

      toast({
        title: 'Connected!',
        description: 'Backend URL saved successfully',
      });

      // Reload the app to use new URL
      window.location.href = '/login';
    } catch (err) {
      console.error('Connection test failed:', err);
      
      // Still save the URL even if test fails (user might know what they're doing)
      await updatePocketBaseUrl(backendUrl);
      
      toast({
        title: 'URL Saved',
        description: 'Could not verify connection, but URL was saved. You can try logging in.',
        variant: 'default',
      });

      navigate('/login');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // Check if already configured (has a URL)
    const currentUrl = getCurrentPbUrl();
    if (currentUrl && currentUrl.length > 0) {
      navigate('/login');
    } else {
      toast({
        title: 'Configuration Required',
        description: 'Please enter your backend URL to continue',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md border border-border/60 bg-background/90 shadow-2xl">
        <CardHeader className="items-center space-y-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Configure Backend</CardTitle>
          <CardDescription className="text-center">
            Enter your Zenthra backend URL to connect the app to your store.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backendUrl">Backend URL</Label>
            <Input
              id="backendUrl"
              type="url"
              placeholder="https://backend.yourstore.com"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              This is the URL where your Zenthra backend is hosted.
            </p>
          </div>

          <Button
            onClick={handleSave}
            className="w-full h-11"
            disabled={isSaving}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Save & Continue
              </div>
            )}
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {backendUrl && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full text-muted-foreground"
            >
              Skip (use existing)
            </Button>
          )}
          <p className="text-xs text-center text-muted-foreground">
            Contact your administrator if you don't know your backend URL.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ConfigureBackendPage;
