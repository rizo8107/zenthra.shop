import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSiteSettingsRecord, createSiteSettingsRecord, updateSiteSettingsRecord, type SiteSettingsRecord } from '@/lib/pocketbase';
import { uploadImage, getContentImageUrl } from '@/lib/content-service';
import { toast } from 'sonner';
import { Loader2, Save, Image as ImageIcon, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';

const BrandingPage: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // File uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);

  // Form state
  const [form, setForm] = useState({
    siteTitle: '',
    siteLogoUrl: '',
    siteFaviconUrl: '',
    siteDescription: '',
    ogImageUrl: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    aboutText: '',
    privacyPolicyHtml: '',
    termsHtml: '',
    shippingPolicyHtml: '',
    cancellationsRefundsHtml: '',
    contactIntroHtml: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const rec = await getSiteSettingsRecord();
      if (rec) {
        setSettings(rec);
        setForm({
          siteTitle: (rec.siteTitle as string) || '',
          siteLogoUrl: (rec.siteLogoUrl as string) || '',
          siteFaviconUrl: (rec.siteFaviconUrl as string) || '',
          siteDescription: (rec.siteDescription as string) || '',
          ogImageUrl: (rec.ogImageUrl as string) || '',
          contactEmail: (rec.contactEmail as string) || '',
          contactPhone: (rec.contactPhone as string) || '',
          contactAddress: (rec.contactAddress as string) || '',
          aboutText: (rec.aboutText as string) || '',
          privacyPolicyHtml: (rec.privacyPolicyHtml as string) || '',
          termsHtml: (rec.termsHtml as string) || '',
          shippingPolicyHtml: (rec.shippingPolicyHtml as string) || '',
          cancellationsRefundsHtml: (rec.cancellationsRefundsHtml as string) || '',
          contactIntroHtml: (rec.contactIntroHtml as string) || '',
        });
      }
    } catch (e) {
      console.error('Failed to load site settings', e);
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const created = await createSiteSettingsRecord({
        siteTitle: 'My Store',
        siteLogoUrl: '',
        siteFaviconUrl: '',
        siteDescription: '',
        ogImageUrl: '',
        contactEmail: '',
        contactPhone: '',
        contactAddress: '',
        aboutText: '',
        privacyPolicyHtml: '',
        termsHtml: '',
        shippingPolicyHtml: '',
        cancellationsRefundsHtml: '',
        contactIntroHtml: '',
      });
      setSettings(created);
      await loadSettings();
      toast.success('Branding settings created successfully');
    } catch (e) {
      console.error('Failed to create site settings', e);
      toast.error('Failed to create branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);

      // Start from current form values
      const updates = { ...form };

      // Upload files to PocketBase `content` collection and store resulting URLs
      if (logoFile) {
        const record = await uploadImage(logoFile);
        if (record) {
          updates.siteLogoUrl = getContentImageUrl(record);
        } else {
          toast.error('Failed to upload store logo');
        }
        setLogoFile(null);
      }

      if (faviconFile) {
        const record = await uploadImage(faviconFile);
        if (record) {
          updates.siteFaviconUrl = getContentImageUrl(record);
        } else {
          toast.error('Failed to upload favicon');
        }
        setFaviconFile(null);
      }

      if (ogImageFile) {
        const record = await uploadImage(ogImageFile);
        if (record) {
          updates.ogImageUrl = getContentImageUrl(record);
        } else {
          toast.error('Failed to upload social image');
        }
        setOgImageFile(null);
      }

      await updateSiteSettingsRecord(settings.id, updates);
      toast.success('Branding settings saved successfully');
      await loadSettings();
    } catch (e) {
      console.error('Failed to save site settings', e);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branding & Policies</h1>
            <p className="text-muted-foreground">Manage your store's branding, contact information, and policy pages</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Create your branding settings to customize your storefront's appearance and content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Branding Settings'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branding & Policies</h1>
            <p className="text-muted-foreground">Customize your store's appearance and manage policy pages</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
            <TabsTrigger value="policies">Policy Pages</TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Store Identity
                </CardTitle>
                <CardDescription>
                  Configure your store's name, logo, and visual identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="siteTitle">Store Name *</Label>
                  <Input
                    id="siteTitle"
                    value={form.siteTitle}
                    onChange={handleChange('siteTitle')}
                    placeholder="e.g., Viruthi Gold"
                  />
                  <p className="text-xs text-muted-foreground">
                    This appears in the browser tab, header, and throughout your store
                  </p>
                </div>

                <ImageUpload
                  label="Store Logo"
                  value={form.siteLogoUrl}
                  onChange={(file, previewUrl) => {
                    setLogoFile(file);
                    // When switching back to URL mode and clearing file, keep the preview as the URL
                    if (!file) {
                      setForm((prev) => ({ ...prev, siteLogoUrl: previewUrl }));
                    }
                  }}
                  onUrlChange={(url) => setForm((prev) => ({ ...prev, siteLogoUrl: url }))}
                  accept="image/png,image/svg+xml,image/jpeg,image/jpg"
                  helpText="Upload your store logo (PNG, SVG, or JPG recommended). This appears in the header and throughout your store."
                />

                <ImageUpload
                  label="Favicon"
                  value={form.siteFaviconUrl}
                  onChange={(file, previewUrl) => {
                    setFaviconFile(file);
                    if (!file) {
                      setForm((prev) => ({ ...prev, siteFaviconUrl: previewUrl }));
                    }
                  }}
                  onUrlChange={(url) => setForm((prev) => ({ ...prev, siteFaviconUrl: url }))}
                  accept="image/x-icon,image/png"
                  helpText="Small icon shown in browser tabs (32x32 or 64x64 pixels, .ico or .png format)"
                />

                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Store Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={form.siteDescription}
                    onChange={handleChange('siteDescription')}
                    rows={3}
                    placeholder="A brief description of your store for search engines and social media"
                  />
                  <p className="text-xs text-muted-foreground">
                    This appears in search results and when sharing your store on social media
                  </p>
                </div>

                <ImageUpload
                  label="Social Share Image"
                  value={form.ogImageUrl}
                  onChange={(file, previewUrl) => {
                    setOgImageFile(file);
                    if (!file) {
                      setForm((prev) => ({ ...prev, ogImageUrl: previewUrl }));
                    }
                  }}
                  onUrlChange={(url) => setForm((prev) => ({ ...prev, ogImageUrl: url }))}
                  accept="image/png,image/jpeg,image/jpg"
                  helpText="Image shown when sharing your store on social media (1200x630 pixels recommended)"
                />

                <div className="space-y-2">
                  <Label htmlFor="aboutText">About Your Store</Label>
                  <Textarea
                    id="aboutText"
                    value={form.aboutText}
                    onChange={handleChange('aboutText')}
                    rows={4}
                    placeholder="Tell customers about your store, mission, and values..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This appears in your store's footer
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Info Tab */}
          <TabsContent value="contact" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>
                  How customers can reach you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange('contactEmail')}
                    placeholder="support@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={handleChange('contactPhone')}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactAddress" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Business Address
                  </Label>
                  <Textarea
                    id="contactAddress"
                    value={form.contactAddress}
                    onChange={handleChange('contactAddress')}
                    rows={4}
                    placeholder="Street Address&#10;City, State - PIN&#10;Country"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use line breaks to separate address lines
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactIntroHtml">Contact Page Introduction</Label>
                  <Textarea
                    id="contactIntroHtml"
                    value={form.contactIntroHtml}
                    onChange={handleChange('contactIntroHtml')}
                    rows={3}
                    placeholder="Optional message shown at the top of your Contact Us page"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can use basic HTML tags like &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Policy Pages
                </CardTitle>
                <CardDescription>
                  Manage your store's legal and informational pages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="privacyPolicyHtml">Privacy Policy</Label>
                  <RichTextEditor
                    content={form.privacyPolicyHtml}
                    onChange={(html) => setForm((prev) => ({ ...prev, privacyPolicyHtml: html }))}
                    placeholder="Explain how you collect, use, and protect customer data..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the toolbar above to format your privacy policy
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="termsHtml">Terms & Conditions</Label>
                  <RichTextEditor
                    content={form.termsHtml}
                    onChange={(html) => setForm((prev) => ({ ...prev, termsHtml: html }))}
                    placeholder="Define the rules and guidelines for using your store..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the toolbar above to format your terms and conditions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shippingPolicyHtml">Shipping Policy</Label>
                  <RichTextEditor
                    content={form.shippingPolicyHtml}
                    onChange={(html) => setForm((prev) => ({ ...prev, shippingPolicyHtml: html }))}
                    placeholder="Explain shipping costs, delivery times, and procedures..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the toolbar above to format your shipping policy
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellationsRefundsHtml">Cancellations & Refunds</Label>
                  <RichTextEditor
                    content={form.cancellationsRefundsHtml}
                    onChange={(html) => setForm((prev) => ({ ...prev, cancellationsRefundsHtml: html }))}
                    placeholder="Detail your return, cancellation, and refund procedures..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the toolbar above to format your cancellations and refunds policy
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Editor Tips</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Use the <strong>Bold</strong> and <strong>Italic</strong> buttons for emphasis</li>
                <li>• Click <strong>H2</strong> to create section headings</li>
                <li>• Use the list buttons for bullet points or numbered lists</li>
                <li>• The content is automatically saved as HTML</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default BrandingPage;
