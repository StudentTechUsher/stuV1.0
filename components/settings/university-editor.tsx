'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useUniversityTheme } from '@/contexts/university-theme-context';
import { University, DEFAULT_THEME } from '@/lib/types/university';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Upload, Check, RotateCcw, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UniversityEditor() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [extractedColors, setExtractedColors] = useState<{
    primary: string;
    secondary: string;
    accent: string;
  }>({ primary: '', secondary: '', accent: '' });
  const [tempColors, setTempColors] = useState({
    primary_color: '#12F987',
    secondary_color: '#0D8B56',
    accent_color: '#85E5C2',
    dark_color: '#0A1B12',
    light_color: '#F0FFF9',
    text_color: '#1A1A1A',
    secondary_text_color: '#666666',
  });

  const { updateUniversityTheme, resetToDefault } = useUniversityTheme();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  } | null>(null);

  const showToast = (message: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load all universities
  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from('university')
          .select('*')
          .order('name');

        if (error) throw error;
        setUniversities(data || []);
      } catch (error) {
        console.error('Error loading universities:', error);
        showToast({
          title: "Error",
          description: "Failed to load universities.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUniversities();
  }, [supabase]);

  // Update selected university data when selection changes
  useEffect(() => {
    const university = universities.find(u => u.id === selectedUniversityId);
    setSelectedUniversity(university || null);

    if (university) {
      setTempColors({
        primary_color: university.primary_color,
        secondary_color: university.secondary_color,
        accent_color: university.accent_color,
        dark_color: university.dark_color,
        light_color: university.light_color,
        text_color: university.text_color,
        secondary_text_color: university.secondary_text_color,
      });
    }
  }, [selectedUniversityId, universities]);

  const extractDominantColors = async (file: File): Promise<{ primary: string; secondary: string; accent: string }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (!imageData) {
          reject(new Error('Failed to get image data'));
          return;
        }

        const data = imageData.data;
        const colorMap = new Map<string, number>();

        // Sample every 10th pixel for performance
        for (let i = 0; i < data.length; i += 40) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];

          // Skip transparent pixels
          if (alpha < 128) continue;

          // Skip very light or very dark colors
          const brightness = (r + g + b) / 3;
          if (brightness < 30 || brightness > 220) continue;

          // Group similar colors together (reduce to blocks of 16)
          const groupedR = Math.floor(r / 16) * 16;
          const groupedG = Math.floor(g / 16) * 16;
          const groupedB = Math.floor(b / 16) * 16;

          const hex = `#${((1 << 24) + (groupedR << 16) + (groupedG << 8) + groupedB).toString(16).slice(1)}`;
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }

        if (colorMap.size === 0) {
          reject(new Error('No suitable colors found'));
          return;
        }

        // Sort colors by frequency and get top 3
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);

        if (sortedColors.length === 0) {
          reject(new Error('No colors extracted'));
          return;
        }

        // Ensure we have at least 3 colors, use fallbacks if needed
        const primary = sortedColors[0] || '#12F987';
        const secondary = sortedColors[1] || adjustBrightness(primary, -20);
        const accent = sortedColors[2] || adjustBrightness(primary, 30);

        resolve({ primary, secondary, accent });
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Helper function to adjust brightness
  const adjustBrightness = (hexColor: string, amount: number): string => {
    const hex = hexColor.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUniversity) return;

    if (!file.type.startsWith('image/')) {
      showToast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, SVG).",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);

    try {
      // Extract dominant colors (top 3)
      const colors = await extractDominantColors(file);
      setExtractedColors(colors);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedUniversity.subdomain}-logo-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('university-logos')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('university-logos')
        .getPublicUrl(fileName);

      // Update university with new logo URL
      await updateUniversityTheme(selectedUniversity.id, { logo_url: publicUrl });

      showToast({
        title: "Logo Uploaded",
        description: `Logo uploaded and 3 colors extracted!`,
      });

    } catch (error) {
      console.error('Error processing logo:', error);
      showToast({
        title: "Processing Failed",
        description: "Could not process the logo.",
        variant: "destructive",
      });
    }
  };

  const applyExtractedColors = () => {
    if (extractedColors.primary) {
      setTempColors(prev => ({
        ...prev,
        primary_color: extractedColors.primary,
        secondary_color: extractedColors.secondary,
        accent_color: extractedColors.accent,
      }));
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedUniversity) return;

    setIsUpdating(true);
    try {
      await updateUniversityTheme(selectedUniversity.id, tempColors);

      showToast({
        title: "Theme Updated",
        description: "University theme has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      showToast({
        title: "Error",
        description: "Failed to update theme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedUniversity) return;

    setIsUpdating(true);
    try {
      await resetToDefault(selectedUniversity.id);

      setTempColors({
        primary_color: DEFAULT_THEME.primary_color,
        secondary_color: DEFAULT_THEME.secondary_color,
        accent_color: DEFAULT_THEME.accent_color,
        dark_color: DEFAULT_THEME.dark_color,
        light_color: DEFAULT_THEME.light_color,
        text_color: DEFAULT_THEME.text_color,
        secondary_text_color: DEFAULT_THEME.secondary_text_color,
      });

      showToast({
        title: "Reset to Default",
        description: "Theme reset to default STU values and logo removed.",
      });
    } catch (error) {
      console.error('Error resetting theme:', error);
      showToast({
        title: "Error",
        description: "Failed to reset theme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApplyAndRedirect = async () => {
    if (!selectedUniversity) return;

    // Save first
    await handleSaveTheme();

    // Check environment
    const isDev = process.env.NEXT_PUBLIC_ENV === 'dev';

    if (isDev) {
      // In dev, just reload the page to apply changes
      window.location.reload();
    } else {
      // In prod, redirect to the subdomain
      const newUrl = `https://${selectedUniversity.subdomain}.stuplanning.com`;
      window.open(newUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading universities...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          University Theme Editor
          <span className="text-sm font-normal text-muted-foreground">(Dev Only)</span>
        </CardTitle>
        <CardDescription>
          Select and customize university themes. Changes affect the entire university's branding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* University Selection */}
        <div className="space-y-2">
          <Label htmlFor="university-select">Select University</Label>
          <Select
            value={selectedUniversityId?.toString() || ''}
            onValueChange={(value) => setSelectedUniversityId(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a university to edit" />
            </SelectTrigger>
            <SelectContent>
              {universities.map((uni) => (
                <SelectItem key={uni.id} value={uni.id.toString()}>
                  {uni.name} ({uni.subdomain})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUniversity && (
          <>
            {/* Logo Upload */}
            <div className="space-y-4">
              <Label htmlFor="logo-upload">University Logo</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>

                {logoFile && extractedColors.primary && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Extracted Colors from: {logoFile.name}</p>

                    {/* Color Preview Swatches */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded border shadow-sm"
                          style={{ backgroundColor: extractedColors.primary }}
                        />
                        <span className="text-xs text-muted-foreground">Primary</span>
                        <span className="text-xs font-mono">{extractedColors.primary}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded border shadow-sm"
                          style={{ backgroundColor: extractedColors.secondary }}
                        />
                        <span className="text-xs text-muted-foreground">Secondary</span>
                        <span className="text-xs font-mono">{extractedColors.secondary}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded border shadow-sm"
                          style={{ backgroundColor: extractedColors.accent }}
                        />
                        <span className="text-xs text-muted-foreground">Accent</span>
                        <span className="text-xs font-mono">{extractedColors.accent}</span>
                      </div>
                    </div>

                    <Button
                      onClick={applyExtractedColors}
                      size="sm"
                      className="w-full"
                    >
                      Apply All 3 Colors
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Color Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(tempColors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>
                    {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id={key}
                      type="color"
                      value={value}
                      onChange={(e) => setTempColors(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-16 h-10 p-1 rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={value}
                      onChange={(e) => setTempColors(prev => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Theme Preview</Label>
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Button style={{ backgroundColor: tempColors.primary_color }} className="text-white">
                    Primary
                  </Button>
                  <Button style={{ backgroundColor: tempColors.secondary_color }} className="text-white">
                    Secondary
                  </Button>
                  <Button style={{ backgroundColor: tempColors.accent_color }} className="text-black">
                    Accent
                  </Button>
                </div>
                <div
                  className="text-sm p-3 rounded"
                  style={{
                    backgroundColor: tempColors.light_color,
                    color: tempColors.text_color,
                    borderLeft: `3px solid ${tempColors.primary_color}`
                  }}
                >
                  <p style={{ color: tempColors.text_color }}>Primary text color</p>
                  <p style={{ color: tempColors.secondary_text_color }}>Secondary text color</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                onClick={handleSaveTheme}
                disabled={isUpdating}
                className="flex-1 min-w-0"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>

              <Button
                onClick={handleApplyAndRedirect}
                disabled={isUpdating}
                variant="outline"
                className="flex-1 min-w-0"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apply & {process.env.NEXT_PUBLIC_ENV === 'dev' ? 'Reload' : 'Visit Site'}
              </Button>

              <Button
                onClick={handleResetToDefault}
                disabled={isUpdating}
                variant="destructive"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset to Default
              </Button>
            </div>
          </>
        )}

        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm">
            <div
              className={`
                ${toastMessage.variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}
                border rounded-lg p-4 shadow-lg
              `}
            >
              <h3 className="font-medium text-sm">{toastMessage.title}</h3>
              {toastMessage.description && (
                <p className="text-sm opacity-90 mt-1">{toastMessage.description}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}