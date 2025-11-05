
import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { requestNotificationPermission } from '@/lib/push-notifications';

const generalFormSchema = z.object({
  storeName: z.string().min(2, {
    message: "Store name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  supportEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  currency: z.string().min(1, {
    message: "Please select a currency.",
  }),
});

const notificationFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  orderConfirmations: z.boolean().default(true),
  stockAlerts: z.boolean().default(true),
  paymentNotifications: z.boolean().default(true),
});

const securityFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const SettingsPage = () => {
  const generalForm = useForm<z.infer<typeof generalFormSchema>>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: {
      storeName: "Konipai Coffee Shop",
      email: "info@konipai.com",
      supportEmail: "support@konipai.com",
      phone: "+1234567890",
      address: "123 Coffee Street, Bean City, 12345",
      currency: "USD",
    },
  });

  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      orderConfirmations: true,
      stockAlerts: true,
      paymentNotifications: true,
    },
  });
  
  const securityForm = useForm<z.infer<typeof securityFormSchema>>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [webhooks, setWebhooks] = useState<Array<{ id: string; url: string; events: string[]; secret: string; active: boolean }>>([]);
  const [newWebhook, setNewWebhook] = useState<{ url: string; events: string; secret: string; active: boolean }>({ url: "", events: "order.created,payment.succeeded", secret: "", active: true });
  const [adminKey, setAdminKey] = useState<string>(localStorage.getItem('WEBHOOKS_ADMIN_API_KEY') || '');
  const [seedUrl, setSeedUrl] = useState<string>('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['order.created','payment.succeeded']);
  const [testEvent, setTestEvent] = useState<string>('order.created');
  const [testPayload, setTestPayload] = useState<string>('{}');
  const eventOptions = useMemo(() => [
    'order.created',
    'order.updated',
    'order.cancelled',
    'payment.succeeded',
    'payment.failed',
    'cart.item_added',
    'cart.item_removed',
    'cart.cleared',
    'user.signed_in',
    'user.signed_out',
    'user.registered',
  ], []);
  const canSaveWebhook = useMemo(() => {
    return Boolean(newWebhook.url && selectedEvents.length > 0);
  }, [newWebhook.url, selectedEvents]);

  const handleGenerateSecret = () => {
    const s = cryptoRandomString();
    setNewWebhook((p) => ({ ...p, secret: s }));
  };

  const handleAddWebhook = () => {
    if (!canSaveWebhook) return;
    const id = selfCryptoUUID();
    const entry = {
      id,
      url: newWebhook.url.trim(),
      events: selectedEvents,
      secret: newWebhook.secret.trim(),
      active: newWebhook.active,
    };
    // Create via API then update local
    void createViaApi({ url: entry.url, events: entry.events, secret: entry.secret, active: entry.active });
    setNewWebhook({ url: "", events: "order.created,payment.succeeded", secret: "", active: true });
    setSelectedEvents(['order.created','payment.succeeded']);
  };

  const toggleActive = (id: string, v: boolean) => {
    setWebhooks((list) => list.map((w) => (w.id === id ? { ...w, active: v } : w)));
    // Persist via API
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (adminKey) headers['x-api-key'] = adminKey;
    void fetch(`/api/webhooks/subscriptions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ active: v })
    }).catch(() => {});
  };

  const removeWebhook = (id: string) => {
    setWebhooks((list) => list.filter((w) => w.id !== id));
    const headers: Record<string,string> = {} as any;
    if (adminKey) headers['x-api-key'] = adminKey;
    void fetch(`/api/webhooks/subscriptions/${id}`, {
      method: 'DELETE',
      headers
    }).catch(() => {});
  };

  function selfCryptoUUID() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as any).randomUUID();
    }
    return 'wh_' + Math.random().toString(36).slice(2, 10);
  }

  // Persist admin key locally
  useEffect(() => {
    if (adminKey) localStorage.setItem('WEBHOOKS_ADMIN_API_KEY', adminKey);
  }, [adminKey]);

  // Load existing webhooks
  useEffect(() => {
    (async () => {
      try {
        const headers: Record<string,string> = {} as any;
        if (adminKey) headers['x-api-key'] = adminKey;
        const res = await fetch('/api/webhooks/subscriptions', { headers });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        setWebhooks(items.map((it: any) => ({ id: it.id, url: it.url, events: it.events || [], secret: it.secret || '', active: Boolean(it.active) })));
      } catch {}
    })();
  }, [adminKey]);

  // Create via API
  async function createViaApi(entry: { url: string; events: string[]; secret: string; active: boolean }) {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (adminKey) headers['x-api-key'] = adminKey;
    const res = await fetch('/api/webhooks/subscriptions', {
      method: 'POST',
      headers,
      body: JSON.stringify(entry)
    });
    if (res.ok) {
      const created = await res.json();
      setWebhooks((list) => [{ id: created.id, ...entry }, ...list]);
    }
  }

  function cryptoRandomString() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < 32; i++) {
      const idx = Math.floor(Math.random() * alphabet.length);
      out += alphabet[idx];
    }
    return out;
  }

  const onGeneralSubmit = (data: z.infer<typeof generalFormSchema>) => {
    console.log("General settings updated:", data);
    // Here you would update the settings via API
  };

  const onNotificationSubmit = (data: z.infer<typeof notificationFormSchema>) => {
    console.log("Notification settings updated:", data);
    // Here you would update the settings via API
  };
  
  const onSecuritySubmit = (data: z.infer<typeof securityFormSchema>) => {
    console.log("Security settings updated:", data);
    // Here you would update the settings via API
  };

  const handleEnablePushNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      // Optionally, show a success message to the user
      console.log('Push notifications enabled.');
    } else {
      // Optionally, show an informative message
      console.log('Push notification permission was not granted.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your store settings and preferences.</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[540px]">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage your store details and preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...generalForm}>
                  <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-4">
                    <FormField
                      control={generalForm.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={generalForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={generalForm.control}
                        name="supportEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Support Email</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={generalForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={generalForm.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={generalForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit">Save Changes</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>Enable push notifications to receive real-time alerts on your device.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for new orders and important updates directly in your browser.
                    </p>
                  </div>
                  <Button onClick={handleEnablePushNotifications}>Enable</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Notification Settings</CardTitle>
                <CardDescription>Configure when and how you receive email notifications.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Email Notifications</FormLabel>
                            <FormDescription>
                              Receive email notifications for important events.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="orderConfirmations"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Order Confirmations</FormLabel>
                            <FormDescription>
                              Receive notifications when new orders are placed.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="stockAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Stock Alerts</FormLabel>
                            <FormDescription>
                              Get notified when product inventory is low.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="paymentNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Payment Notifications</FormLabel>
                            <FormDescription>
                              Receive alerts for payment confirmations and issues.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit">Save Preferences</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security and password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Change Password</h3>
                      <Separator />
                      <div className="space-y-4 pt-2">
                        <div className="grid gap-4">
                          <FormField
                            control={securityForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={securityForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={securityForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit">Update Password</Button>
                      </div>
                    </div>
                  </form>
                </Form>
                
                <div className="space-y-2 pt-4">
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <Separator />
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="font-medium">Two-factor authentication is disabled</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>Configure outgoing webhooks for key events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Admin API Key */}
                <div className="space-y-2">
                  <Label htmlFor="wh-admin">Admin API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input id="wh-admin" placeholder="Set WEBHOOKS_ADMIN_API_KEY to manage subscriptions" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
                    <Button variant="outline" onClick={() => setAdminKey('')}>Clear</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">This key is required to list/create/update/delete subscriptions.</p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Add Subscription</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wh-url">Destination URL</Label>
                      <Input id="wh-url" value={newWebhook.url} onChange={(e) => setNewWebhook((p) => ({ ...p, url: e.target.value }))} placeholder="https://example.com/webhook" />
                    </div>
                    <div className="space-y-2">
                      <Label>Events</Label>
                      <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                        {eventOptions.map((ev) => (
                          <label key={ev} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={selectedEvents.includes(ev)}
                              onChange={(e) => {
                                setSelectedEvents((prev) => e.target.checked ? Array.from(new Set([...prev, ev])) : prev.filter(x => x !== ev));
                              }}
                            />
                            <span>{ev}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wh-secret">Signing Secret</Label>
                      <Input id="wh-secret" value={newWebhook.secret} onChange={(e) => setNewWebhook((p) => ({ ...p, secret: e.target.value }))} placeholder="auto-generate or paste" />
                    </div>
                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center gap-3">
                        <Switch checked={newWebhook.active} onCheckedChange={(v) => setNewWebhook((p) => ({ ...p, active: Boolean(v) }))} />
                        <Label>Active</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleAddWebhook(selectedEvents)} disabled={!canSaveWebhook}>Save</Button>
                    <Button variant="outline" onClick={handleGenerateSecret}>Generate Secret</Button>
                  </div>
                  <Separator />
                </div>

                {/* Seed initial subscription */}
                <div className="space-y-3">
                  <h3 className="font-medium">Seed Subscription</h3>
                  <div className="flex items-center gap-2">
                    <Input placeholder="https://your-n8n.example/webhook/xyz" value={seedUrl} onChange={(e) => setSeedUrl(e.target.value)} />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!seedUrl || !adminKey) return;
                        const seedEvents = ['order.created','payment.succeeded','payment.failed'];
                        void createViaApi({ url: seedUrl.trim(), events: seedEvents, secret: cryptoRandomString(), active: true });
                        setSeedUrl('');
                      }}
                    >Seed</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Quickly add your automation endpoint (e.g., n8n) subscribed to common events.</p>
                </div>

                {/* Send Test Webhook */}
                <div className="space-y-3">
                  <h3 className="font-medium">Send Test Webhook</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Event</Label>
                      <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                        {eventOptions.map((ev) => (
                          <label key={ev} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="test-event"
                              className="h-4 w-4"
                              checked={testEvent === ev}
                              onChange={() => setTestEvent(ev)}
                            />
                            <span>{ev}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Payload (JSON)</Label>
                      <textarea
                        className="w-full min-h-[160px] rounded-md border bg-background p-3 font-mono text-sm"
                        value={testPayload}
                        onChange={(e) => setTestPayload(e.target.value)}
                        placeholder='{"hello":"world"}'
                      />
                    </div>
                  </div>
                  <div>
                    <Button
                      onClick={async () => {
                        let data: any = {};
                        try {
                          data = testPayload?.trim() ? JSON.parse(testPayload) : {};
                        } catch (e) {
                          console.error('Invalid JSON payload');
                          return;
                        }
                        const res = await fetch('/api/webhooks/emit', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: testEvent, data, source: 'admin' })
                        });
                        if (res.ok) {
                          console.log('Test webhook sent');
                        } else {
                          console.error('Failed to send test webhook');
                        }
                      }}
                    >Send Test</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Subscriptions</h3>
                  <div className="grid gap-3">
                    {webhooks.length === 0 && (
                      <p className="text-sm text-muted-foreground">No webhooks added yet.</p>
                    )}
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="rounded-lg border p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{wh.url}</p>
                            <p className="text-xs text-muted-foreground truncate">Events: {wh.events.join(', ')}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch checked={wh.active} onCheckedChange={(v) => toggleActive(wh.id, Boolean(v))} />
                              <span className="text-sm">{wh.active ? 'Active' : 'Disabled'}</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => removeWebhook(wh.id)}>Delete</Button>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground break-all">Secret: {wh.secret || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
