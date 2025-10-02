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
  const [brandUrl, setBrandUrl] = useState('');
  const [isExtractingFromUrl, setIsExtractingFromUrl] = useState(false);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [selectedExtractedColor, setSelectedExtractedColor] = useState<string | null>(null);
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
      setExtractedColors([colors.primary, colors.secondary, colors.accent]);
      setSelectedExtractedColor(null);

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

  const extractColorsFromUrl = async () => {
    if (!brandUrl.trim()) {
      showToast({
        title: "Invalid URL",
        description: "Please enter a valid brand guidelines URL.",
        variant: "destructive",
      });
      return;
    }

    setIsExtractingFromUrl(true);
    try {
      // Use a simple regex to find hex colors in the webpage
      const response = await fetch(brandUrl, { mode: 'no-cors' });

      // Since we can't read the response with no-cors, we'll use a proxy or fallback
      // For now, let's create a simple API route to fetch and parse
      const apiResponse = await fetch('/api/extract-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: brandUrl })
      });

      if (!apiResponse.ok) {
        throw new Error('Failed to extract colors from URL');
      }

      const { colors } = await apiResponse.json();

      if (colors && colors.length > 0) {
        setExtractedColors(colors);
        setSelectedExtractedColor(null);

        showToast({
          title: "Colors Extracted!",
          description: `Found ${colors.length} colors from the brand page.`,
        });
      } else {
        throw new Error('No colors found');
      }

    } catch (error) {
      console.error('Error extracting colors from URL:', error);
      showToast({
        title: "Extraction Failed",
        description: "Could not extract colors from the URL. Try uploading a logo instead.",
        variant: "destructive",
      });
    } finally {
      setIsExtractingFromUrl(false);
    }
  };

  const assignColorToField = (color: string, field: keyof typeof tempColors) => {
    setTempColors(prev => ({
      ...prev,
      [field]: color,
    }));
    showToast({
      title: "Color Assigned",
      description: `${color} assigned to ${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    });
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
            {/* Brand URL Extractor */}
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600" />
                <Label htmlFor="brand-url" className="text-blue-900 font-semibold">
                  Extract Colors from Brand Guidelines URL
                </Label>
              </div>
              <p className="text-sm text-blue-700">
                Paste a link to your university's brand guidelines page, and we'll automatically extract the main colors.
              </p>
              <div className="flex gap-2">
                <Input
                  id="brand-url"
                  type="url"
                  placeholder="https://university.edu/brand-guidelines"
                  value={brandUrl}
                  onChange={(e) => setBrandUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={extractColorsFromUrl}
                  disabled={isExtractingFromUrl || !brandUrl.trim()}
                  variant="outline"
                >
                  {isExtractingFromUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Extract Colors'
                  )}
                </Button>
              </div>

              {/* Display extracted colors */}
              {extractedColors.length > 0 && (
                <div className="space-y-3 mt-4 p-4 bg-white border border-blue-300 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900">
                    Extracted {extractedColors.length} colors - Click a color, then choose where to assign it:
                  </p>

                  {/* Color grid */}
                  <div className="grid grid-cols-5 gap-3">
                    {extractedColors.map((color, index) => (
                      <div key={index} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => setSelectedExtractedColor(color)}
                          className={`w-14 h-14 rounded-lg border-2 shadow-sm transition-all hover:scale-105 ${
                            selectedExtractedColor === color ? 'border-blue-600 ring-2 ring-blue-400' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Click to select ${color}`}
                        />
                        <span className="text-xs font-mono text-gray-700">{color}</span>
                      </div>
                    ))}
                  </div>

                  {/* Assignment dropdown */}
                  {selectedExtractedColor && (
                    <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        Selected: <span className="font-mono">{selectedExtractedColor}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-blue-800">Assign to:</Label>
                        <Select
                          onValueChange={(value) => assignColorToField(selectedExtractedColor, value as keyof typeof tempColors)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Choose a field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary_color">Primary Color</SelectItem>
                            <SelectItem value="secondary_color">Secondary Color</SelectItem>
                            <SelectItem value="accent_color">Accent Color</SelectItem>
                            <SelectItem value="dark_color">Dark Color</SelectItem>
                            <SelectItem value="light_color">Light Color</SelectItem>
                            <SelectItem value="text_color">Text Color</SelectItem>
                            <SelectItem value="secondary_text_color">Secondary Text Color</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
              <Label htmlFor="logo-upload">University Logo (Alternative Method)</Label>
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

                {logoFile && extractedColors.length > 0 && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Extracted {extractedColors.length} colors from: {logoFile.name}</p>
                    <p className="text-xs text-muted-foreground">Use the extracted colors section above to assign them to fields.</p>
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