import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { updateSiteSettings } from "@/lib/pocketbase";
import { toast } from "sonner";

export default function SiteSettingsPage() {
  const { settings, loading } = useSiteSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    siteTitle: "",
    siteLogoUrl: "",
    siteFaviconUrl: "",
    siteDescription: "",
    ogImageUrl: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    aboutText: "",
    privacyPolicyHtml: "",
    termsHtml: "",
    shippingPolicyHtml: "",
    cancellationsRefundsHtml: "",
    contactIntroHtml: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        siteTitle: settings.siteTitle || "",
        siteLogoUrl: settings.siteLogoUrl || "",
        siteFaviconUrl: settings.siteFaviconUrl || "",
        siteDescription: settings.siteDescription || "",
        ogImageUrl: settings.ogImageUrl || "",
        contactEmail: settings.contactEmail || "",
        contactPhone: settings.contactPhone || "",
        contactAddress: settings.contactAddress || "",
        aboutText: settings.aboutText || "",
        privacyPolicyHtml: settings.privacyPolicyHtml || "",
        termsHtml: settings.termsHtml || "",
        shippingPolicyHtml: settings.shippingPolicyHtml || "",
        cancellationsRefundsHtml: settings.cancellationsRefundsHtml || "",
        contactIntroHtml: settings.contactIntroHtml || "",
      });
    }
  }, [settings]);

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await updateSiteSettings(settings.id, {
        siteTitle: form.siteTitle,
        siteLogoUrl: form.siteLogoUrl,
        siteFaviconUrl: form.siteFaviconUrl,
        siteDescription: form.siteDescription,
        ogImageUrl: form.ogImageUrl,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        contactAddress: form.contactAddress,
        aboutText: form.aboutText,
        privacyPolicyHtml: form.privacyPolicyHtml,
        termsHtml: form.termsHtml,
        shippingPolicyHtml: form.shippingPolicyHtml,
        cancellationsRefundsHtml: form.cancellationsRefundsHtml,
        contactIntroHtml: form.contactIntroHtml,
      });
      toast.success("Site settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save site settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="konipai-container py-12 flex justify-center items-center">
        <p>Loading site settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="konipai-container py-12 flex justify-center items-center">
        <p>No site settings record found.</p>
      </div>
    );
  }

  return (
    <div className="konipai-container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Site Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-2">Branding & SEO</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="siteTitle">Site Title</Label>
            <Input
              id="siteTitle"
              value={form.siteTitle}
              onChange={handleChange("siteTitle")}
              placeholder="Site name shown in logo and title"
            />
          </div>
          <div>
            <Label htmlFor="siteLogoUrl">Logo URL</Label>
            <Input
              id="siteLogoUrl"
              value={form.siteLogoUrl}
              onChange={handleChange("siteLogoUrl")}
              placeholder="https://.../logo.png"
            />
          </div>
          <div>
            <Label htmlFor="siteFaviconUrl">Favicon URL</Label>
            <Input
              id="siteFaviconUrl"
              value={form.siteFaviconUrl}
              onChange={handleChange("siteFaviconUrl")}
              placeholder="https://.../favicon.ico"
            />
          </div>
          <div>
            <Label htmlFor="ogImageUrl">OG / Social Image URL</Label>
            <Input
              id="ogImageUrl"
              value={form.ogImageUrl}
              onChange={handleChange("ogImageUrl")}
              placeholder="https://.../og-image.png"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="siteDescription">Meta Description</Label>
          <Textarea
            id="siteDescription"
            value={form.siteDescription}
            onChange={handleChange("siteDescription")}
            rows={3}
            placeholder="Short description for SEO and social cards"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-2">Store Info</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              value={form.contactEmail}
              onChange={handleChange("contactEmail")}
              placeholder="support@example.com"
            />
          </div>
          <div>
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={handleChange("contactPhone")}
              placeholder="+91..."
            />
          </div>
        </div>
        <div>
          <Label htmlFor="contactAddress">Contact Address</Label>
          <Textarea
            id="contactAddress"
            value={form.contactAddress}
            onChange={handleChange("contactAddress")}
            rows={3}
            placeholder={"Address lines (use new lines)"}
          />
        </div>
        <div>
          <Label htmlFor="aboutText">About Text (Footer)</Label>
          <Textarea
            id="aboutText"
            value={form.aboutText}
            onChange={handleChange("aboutText")}
            rows={3}
            placeholder="Short paragraph about the brand shown in footer"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-2">Policy Pages Content</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="privacyPolicyHtml">Privacy Policy</Label>
            <Textarea
              id="privacyPolicyHtml"
              value={form.privacyPolicyHtml}
              onChange={handleChange("privacyPolicyHtml")}
              rows={8}
              placeholder="HTML or text content for /privacy-policy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="termsHtml">Terms & Conditions</Label>
            <Textarea
              id="termsHtml"
              value={form.termsHtml}
              onChange={handleChange("termsHtml")}
              rows={8}
              placeholder="HTML or text content for /terms-and-conditions"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shippingPolicyHtml">Shipping Policy</Label>
            <Textarea
              id="shippingPolicyHtml"
              value={form.shippingPolicyHtml}
              onChange={handleChange("shippingPolicyHtml")}
              rows={8}
              placeholder="HTML or text content for /shipping-policy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellationsRefundsHtml">Cancellations & Refunds</Label>
            <Textarea
              id="cancellationsRefundsHtml"
              value={form.cancellationsRefundsHtml}
              onChange={handleChange("cancellationsRefundsHtml")}
              rows={8}
              placeholder="HTML or text content for /cancellations-refunds"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="contactIntroHtml">Contact Page Intro</Label>
          <Textarea
            id="contactIntroHtml"
            value={form.contactIntroHtml}
            onChange={handleChange("contactIntroHtml")}
            rows={4}
            placeholder="Optional rich text shown at top of Contact Us page"
          />
        </div>
      </Card>
    </div>
  );
}
