import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { pb } from '@/lib/pocketbase';
import { Palette, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Theme {
  id: string;
  name: string;
  is_active: boolean;
  primary_color: string;
  primary_color_hover: string;
  primary_color_hsl: string;
  accent_color: string;
  accent_color_hsl: string;
  text_on_primary: string;
  dark_mode_primary_color_hsl: string;
  dark_mode_accent_color_hsl: string;
  data?: {
    primary?: { hex: string; hsl: string };
    accent?: { hex: string; hsl: string };
    background?: { hex: string; hsl: string };
    text?: { hex: string; hsl: string };
    [key: string]: any;
  };
  created: string;
  updated: string;
}

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Helper function to get color value from theme (supports both old and new format)
const getThemeColor = (theme: Theme, colorType: 'primary' | 'accent' | 'background' | 'text', format: 'hex' | 'hsl' = 'hex'): string => {
  // Try new data format first
  if (theme.data && theme.data[colorType]) {
    return theme.data[colorType][format] || '';
  }
  
  // Fallback to old format
  switch (colorType) {
    case 'primary':
      return format === 'hex' ? theme.primary_color : theme.primary_color_hsl;
    case 'accent':
      return format === 'hex' ? theme.accent_color : theme.accent_color_hsl;
    default:
      return '';
  }
};

// Helper function to set color value in theme
const setThemeColor = (theme: Theme, colorType: 'primary' | 'accent' | 'background' | 'text', format: 'hex' | 'hsl', value: string): Theme => {
  const updatedTheme = { ...theme };
  
  // Initialize data if it doesn't exist
  if (!updatedTheme.data) {
    updatedTheme.data = {};
  }
  
  // Initialize color object if it doesn't exist
  if (!updatedTheme.data[colorType]) {
    updatedTheme.data[colorType] = { hex: '', hsl: '' };
  }
  
  // Set the value
  updatedTheme.data[colorType][format] = value;
  
  // Also update old format for backward compatibility
  if (colorType === 'primary' && format === 'hex') {
    updatedTheme.primary_color = value;
    updatedTheme.primary_color_hsl = hexToHsl(value);
  } else if (colorType === 'accent' && format === 'hex') {
    updatedTheme.accent_color = value;
    updatedTheme.accent_color_hsl = hexToHsl(value);
  }
  
  return updatedTheme;
};

const PREMADE_TEMPLATES = [
  {
    name: 'Warm Brown',
    primaryHex: '#a67b5c',
    primaryHsl: '26 29% 51%',
    accentHex: '#c4a992',
    accentHsl: '26 29% 65%',
    textOnPrimary: '#ffffff',
    darkPrimaryHsl: '26 29% 35%',
    darkAccentHsl: '26 29% 25%',
  },
  {
    name: 'Teal',
    primaryHex: '#32a1a1',
    primaryHsl: '181 70% 44%',
    accentHex: '#7cc0c0',
    accentHsl: '181 40% 60%',
    textOnPrimary: '#ffffff',
    darkPrimaryHsl: '181 35% 35%',
    darkAccentHsl: '181 30% 28%',
  },
  {
    name: 'Rose',
    primaryHex: '#e11d48',
    primaryHsl: '350 81% 51%',
    accentHex: '#f472b6',
    accentHsl: '330 87% 67%',
    textOnPrimary: '#ffffff',
    darkPrimaryHsl: '350 60% 42%',
    darkAccentHsl: '330 60% 45%',
  },
  {
    name: 'Forest Green',
    primaryHex: '#15803d',
    primaryHsl: '142 72% 28%',
    accentHex: '#86efac',
    accentHsl: '142 71% 80%',
    textOnPrimary: '#ffffff',
    darkPrimaryHsl: '142 50% 24%',
    darkAccentHsl: '142 40% 30%',
  },
  {
    name: 'Indigo',
    primaryHex: '#4f46e5',
    primaryHsl: '243 75% 58%',
    accentHex: '#a5b4fc',
    accentHsl: '237 91% 85%',
    textOnPrimary: '#ffffff',
    darkPrimaryHsl: '243 60% 46%',
    darkAccentHsl: '237 50% 40%',
  },
];

export default function ThemesManager() {
  const { toast } = useToast();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('theme_settings').getFullList<Theme>({
        sort: '-created',
      });
      setThemes(records);
      const active = records.find((t) => t.is_active);
      if (active) {
        setSelectedTheme(active as Theme);
      } else if (records.length > 0) {
        setSelectedTheme(records[0] as Theme);
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load themes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
  }, []);


  const createNewTheme = async () => {
    try {
      setSaving(true);
      const newTheme = await pb.collection('theme_settings').create({
        name: 'New Theme',
        is_active: false,
        primary_color: '#a67b5c',
        primary_color_hover: '#8a6549',
        primary_color_hsl: '26 29% 51%',
        accent_color: '#c4a992',
        accent_color_hsl: '26 29% 65%',
        text_on_primary: '#ffffff',
        dark_mode_primary_color_hsl: '26 29% 35%',
        dark_mode_accent_color_hsl: '26 29% 25%',
      });

      await loadThemes();
      setSelectedTheme(newTheme);
      toast({
        title: 'Success',
        description: 'New theme created',
      });
    } catch (error) {
      console.error('Failed to create theme:', error);
      toast({
        title: 'Error',
        description: 'Failed to create theme',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const createFromTemplate = async (template: typeof PREMADE_TEMPLATES[0]) => {
    try {
      setSaving(true);
      const newTheme = await pb.collection('theme_settings').create({
        name: template.name,
        is_active: false,
        primary_color: template.primaryHex,
        primary_color_hover: template.primaryHex,
        primary_color_hsl: template.primaryHsl,
        accent_color: template.accentHex,
        accent_color_hsl: template.accentHsl,
        text_on_primary: template.textOnPrimary,
        dark_mode_primary_color_hsl: template.darkPrimaryHsl,
        dark_mode_accent_color_hsl: template.darkAccentHsl,
      });

      await loadThemes();
      setSelectedTheme(newTheme);
      toast({
        title: 'Success',
        description: `${template.name} theme created`,
      });
    } catch (error) {
      console.error('Failed to create theme:', error);
      toast({
        title: 'Error',
        description: 'Failed to create theme',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async () => {
    if (!selectedTheme) return;

    try {
      setSaving(true);
      await pb.collection('theme_settings').update(selectedTheme.id, {
        name: selectedTheme.name,
        primary_color: selectedTheme.primary_color,
        primary_color_hover: selectedTheme.primary_color_hover,
        primary_color_hsl: selectedTheme.primary_color_hsl,
        accent_color: selectedTheme.accent_color,
        accent_color_hsl: selectedTheme.accent_color_hsl,
        text_on_primary: selectedTheme.text_on_primary,
        dark_mode_primary_color_hsl: selectedTheme.dark_mode_primary_color_hsl,
        dark_mode_accent_color_hsl: selectedTheme.dark_mode_accent_color_hsl,
      });

      await loadThemes();
      toast({
        title: 'Success',
        description: 'Theme saved successfully',
      });
    } catch (error) {
      console.error('Failed to save theme:', error);
      toast({
        title: 'Error',
        description: 'Failed to save theme',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const activateTheme = async (themeId: string) => {
    try {
      setSaving(true);

      // Deactivate all themes first
      const allThemes = await pb.collection('theme_settings').getFullList<Theme>();
      for (const theme of allThemes) {
        if (theme.is_active) {
          await pb.collection('theme_settings').update(theme.id, { is_active: false });
        }
      }

      // Activate selected theme
      await pb.collection('theme_settings').update(themeId, { is_active: true });

      await loadThemes();
      toast({
        title: 'Success',
        description: 'Theme activated',
      });
    } catch (error) {
      console.error('Failed to activate theme:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate theme',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteTheme = async (themeId: string) => {
    if (!confirm('Are you sure you want to delete this theme?')) return;

    try {
      setSaving(true);
      await pb.collection('theme_settings').delete(themeId);

      await loadThemes();
      if (selectedTheme?.id === themeId) {
        setSelectedTheme(null);
      }

      toast({
        title: 'Success',
        description: 'Theme deleted',
      });
    } catch (error) {
      console.error('Failed to delete theme:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete theme',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateThemeField = (field: keyof Theme, value: string) => {
    if (!selectedTheme) return;

    const updated = { ...selectedTheme, [field]: value };

    // Auto-calculate HSL when hex changes
    if (field === 'primary_color') {
      updated.primary_color_hsl = hexToHsl(value);
    } else if (field === 'accent_color') {
      updated.accent_color_hsl = hexToHsl(value);
    }

    setSelectedTheme(updated);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading themes...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Palette className="h-8 w-8" />
              Theme Manager
            </h1>
            <p className="text-muted-foreground mt-1">
              Customize your store's appearance with themes and color schemes
            </p>
          </div>
          <Button onClick={createNewTheme} disabled={saving} className="flex items-center gap-2">
            <Plus size={16} />
            Create Theme
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Theme List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Themes</CardTitle>
                <CardDescription>Select a theme to edit</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 p-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        selectedTheme?.id === theme.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: theme.primary_color }}
                        />
                        <span className="font-medium">{theme.name}</span>
                      </div>
                      {theme.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          <Check size={12} className="mr-1" />
                          Active
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Premade Templates */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles size={16} />
                  Templates
                </CardTitle>
                <CardDescription>Start with a premade theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {PREMADE_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => createFromTemplate(template)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: template.primaryHex }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: template.accentHex }}
                      />
                    </div>
                    <span className="text-sm font-medium">{template.name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Theme Editor */}
          <div className="lg:col-span-3">
            {selectedTheme ? (
              <div className="space-y-6">
                {/* Theme Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Theme Settings</CardTitle>
                    <CardDescription>Customize colors and appearance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Theme Name */}
                    <div className="grid gap-2">
                      <Label htmlFor="theme-name">Theme Name</Label>
                      <Input
                        id="theme-name"
                        value={selectedTheme.name}
                        onChange={(e) => updateThemeField('name', e.target.value)}
                        placeholder="My Theme"
                      />
                    </div>

                    {/* Color Pickers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={getThemeColor(selectedTheme, 'primary', 'hex') || '#000000'}
                            onChange={(e) => {
                              const updatedTheme = setThemeColor(selectedTheme, 'primary', 'hex', e.target.value);
                              setSelectedTheme(updatedTheme);
                            }}
                            className="w-16 h-16 rounded-lg border cursor-pointer"
                          />
                          <Input
                            value={getThemeColor(selectedTheme, 'primary', 'hex') || '#000000'}
                            onChange={(e) => {
                              const updatedTheme = setThemeColor(selectedTheme, 'primary', 'hex', e.target.value);
                              setSelectedTheme(updatedTheme);
                            }}
                            placeholder="#000000"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          HSL: {getThemeColor(selectedTheme, 'primary', 'hsl') || 'Auto-calculated'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Primary Hover</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={selectedTheme.primary_color_hover || '#000000'}
                            onChange={(e) => updateThemeField('primary_color_hover', e.target.value)}
                            className="w-16 h-16 rounded-lg border cursor-pointer"
                          />
                          <Input
                            value={selectedTheme.primary_color_hover || '#000000'}
                            onChange={(e) => updateThemeField('primary_color_hover', e.target.value)}
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Accent Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={getThemeColor(selectedTheme, 'accent', 'hex') || '#000000'}
                            onChange={(e) => {
                              const updatedTheme = setThemeColor(selectedTheme, 'accent', 'hex', e.target.value);
                              setSelectedTheme(updatedTheme);
                            }}
                            className="w-16 h-16 rounded-lg border cursor-pointer"
                          />
                          <Input
                            value={getThemeColor(selectedTheme, 'accent', 'hex') || '#000000'}
                            onChange={(e) => {
                              const updatedTheme = setThemeColor(selectedTheme, 'accent', 'hex', e.target.value);
                              setSelectedTheme(updatedTheme);
                            }}
                            placeholder="#000000"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          HSL: {getThemeColor(selectedTheme, 'accent', 'hsl') || 'Auto-calculated'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Text on Primary</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={selectedTheme.text_on_primary}
                            onChange={(e) => updateThemeField('text_on_primary', e.target.value)}
                            className="w-16 h-16 rounded-lg border cursor-pointer"
                          />
                          <Input
                            value={selectedTheme.text_on_primary}
                            onChange={(e) => updateThemeField('text_on_primary', e.target.value)}
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Dark Primary HSL</Label>
                        <Input
                          value={selectedTheme.dark_mode_primary_color_hsl}
                          onChange={(e) =>
                            updateThemeField('dark_mode_primary_color_hsl', e.target.value)
                          }
                          placeholder="26 29% 35%"
                        />
                        <p className="text-xs text-muted-foreground">Format: H S% L%</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Dark Accent HSL</Label>
                        <Input
                          value={selectedTheme.dark_mode_accent_color_hsl}
                          onChange={(e) =>
                            updateThemeField('dark_mode_accent_color_hsl', e.target.value)
                          }
                          placeholder="26 29% 25%"
                        />
                        <p className="text-xs text-muted-foreground">Format: H S% L%</p>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="rounded-lg border p-6 space-y-4">
                      <h3 className="font-semibold mb-4">Preview</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                          style={{
                            backgroundColor: selectedTheme.primary_color,
                            color: selectedTheme.text_on_primary,
                          }}
                        >
                          Primary
                        </Button>
                        <Button
                          style={{
                            backgroundColor: selectedTheme.primary_color_hover,
                            color: selectedTheme.text_on_primary,
                          }}
                        >
                          Hover
                        </Button>
                        <Button
                          variant="secondary"
                          style={{
                            backgroundColor: selectedTheme.accent_color,
                            color: selectedTheme.text_on_primary,
                          }}
                        >
                          Accent
                        </Button>
                        <Button variant="outline">Outline</Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedTheme.is_active}
                          onCheckedChange={() => activateTheme(selectedTheme.id)}
                          disabled={saving}
                        />
                        <Label>Active Theme</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveTheme} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteTheme(selectedTheme.id)}
                          disabled={saving}
                        >
                          <Trash2 size={16} className="mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Palette size={48} className="text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Theme Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a theme from the list or create a new one
                  </p>
                  <Button onClick={createNewTheme}>Create New Theme</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
