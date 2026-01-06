'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useUniversityTheme } from '@/contexts/university-theme-context';
import { University, DEFAULT_THEME } from '@/lib/types/university';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Upload, Check, RotateCcw, ExternalLink } from 'lucide-react';

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
  const [hexInputValues, setHexInputValues] = useState({
    primary_color: '12F987',
    secondary_color: '0D8B56',
    accent_color: '85E5C2',
    dark_color: '0A1B12',
    light_color: 'F0FFF9',
    text_color: '1A1A1A',
    secondary_text_color: '666666',
  });

  const { updateUniversityTheme, resetToDefault } = useUniversityTheme();
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
        primary_color: university.primary_color || '#12F987',
        secondary_color: university.secondary_color || '#0D8B56',
        accent_color: university.accent_color || '#85E5C2',
        dark_color: university.dark_color || '#0A1B12',
        light_color: university.light_color || '#F0FFF9',
        text_color: university.text_color || '#1A1A1A',
        secondary_text_color: university.secondary_text_color || '#666666',
      });
      // Initialize hex input values (without the #)
      setHexInputValues({
        primary_color: (university.primary_color || '#12F987').replace('#', ''),
        secondary_color: (university.secondary_color || '#0D8B56').replace('#', ''),
        accent_color: (university.accent_color || '#85E5C2').replace('#', ''),
        dark_color: (university.dark_color || '#0A1B12').replace('#', ''),
        light_color: (university.light_color || '#F0FFF9').replace('#', ''),
        text_color: (university.text_color || '#1A1A1A').replace('#', ''),
        secondary_text_color: (university.secondary_text_color || '#666666').replace('#', ''),
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

      const { error } = await supabase.storage
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
      // Since we can&apos;t read the response with no-cors, we&apos;ll use a proxy or fallback
      // For now, let's create a simple API route to fetch and parse
      const apiResponse = await fetch('/api/extract-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: brandUrl, numColors: 5 })
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.details || errorData.error || 'Failed to extract colors from URL');
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast({
        title: "Extraction Failed",
        description: errorMessage.includes('blocking') || errorMessage.includes('timed out')
          ? "The website is blocking automated requests. Try uploading the university logo instead for color extraction."
          : "Could not extract colors from the URL. Try uploading a logo instead.",
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
          description: `${color} assigned to ${field.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`,
    });
  };

  const handleSaveTheme = async () => {
    if (!selectedUniversity) return;

    setIsUpdating(true);
    try {
      // Save theme using context method
      await updateUniversityTheme(selectedUniversity.id, tempColors);

      showToast({
        title: "Theme Updated",
        description: "University theme has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update theme. Please try again.",
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
      <Card className="p-0 border-0 rounded-[7px] overflow-hidden shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)] bg-white">
        <CardContent className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Loading universities...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0 border-0 rounded-[7px] overflow-hidden shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)] bg-white">
      {/* Bold black header like academic-summary */}
      <div className="bg-[#0A0A0A] border-b-2 border-[#0A0A0A] p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary)] shadow-lg">
            <Palette className="h-6 w-6 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <CardTitle className="text-white font-[family-name:var(--font-header)] font-extrabold text-xl mb-1">
              University Theme Editor
            </CardTitle>
            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--primary)]">Dev Only</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        <CardDescription className="text-[var(--muted-foreground)] text-sm leading-relaxed">
          Select and customize university themes. Changes affect the entire university&apos;s branding and visual identity.
        </CardDescription>
        {/* University Selection */}
        <div className="space-y-3">
          <Label htmlFor="university-select" className="text-sm font-semibold text-[var(--foreground)]">
            Select University
          </Label>
          <Select
            value={selectedUniversityId?.toString() || ''}
            onValueChange={(value) => setSelectedUniversityId(parseInt(value))}
          >
            <SelectTrigger
              id="university-select"
              className="w-full h-12 rounded-xl border-[var(--border)] hover:border-[var(--primary)] transition-colors duration-200 focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-20"
            >
              <SelectValue placeholder="Choose a university to edit" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {universities.map((uni) => (
                <SelectItem
                  key={uni.id}
                  value={uni.id.toString()}
                  className="rounded-lg my-1 cursor-pointer"
                >
                  <div className="flex flex-col py-1">
                    <span className="font-semibold text-sm">{uni.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{uni.subdomain}.stuplanning.com</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUniversity && (
          <>
            {/* Brand URL Extractor */}
            <div className="space-y-4 p-5 bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_8%,transparent)] to-[color-mix(in_srgb,var(--primary)_3%,transparent)] border-2 border-[color-mix(in_srgb,var(--primary)_20%,transparent)] rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--primary)] shadow-md">
                  <Palette className="h-5 w-5 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <Label htmlFor="brand-url" className="text-[var(--foreground)] font-bold text-base">
                    Extract Colors from Brand Guidelines
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Automatically extract colors from your university&apos;s brand page
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="brand-url" className="text-xs font-semibold text-[var(--foreground)]">
                    Brand Guidelines URL
                  </Label>
                  <Input
                    id="brand-url"
                    type="url"
                    placeholder="https://university.edu/brand-guidelines"
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    className="h-11 rounded-xl border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-20"
                  />
                </div>
                <Button
                  onClick={extractColorsFromUrl}
                  disabled={isExtractingFromUrl || !brandUrl.trim()}
                  variant="primary"
                  className="h-11 px-5 rounded-xl"
                >
                  {isExtractingFromUrl ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Extracting...
                    </>
                  ) : (
                    'Extract Colors'
                  )}
                </Button>
              </div>

              {/* Display extracted colors */}
              {extractedColors.length > 0 && (
                <div className="space-y-4 mt-4 p-5 bg-white border-2 border-[var(--border)] rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Extracted {extractedColors.length} colors
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Click a color to select, then assign it
                    </p>
                  </div>

                  {/* Color grid */}
                  <div className="grid grid-cols-5 gap-3">
                    {extractedColors.map((color, index) => (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => setSelectedExtractedColor(color)}
                          className={`w-16 h-16 rounded-xl border-2 shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                            selectedExtractedColor === color
                              ? 'border-[var(--primary)] ring-4 ring-[color-mix(in_srgb,var(--primary)_30%,transparent)] scale-105'
                              : 'border-[var(--border)] hover:border-[var(--primary)]'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Click to select ${color}`}
                          type="button"
                        />
                        <span className="text-xs font-mono font-semibold text-[var(--muted-foreground)]">{color}</span>
                      </div>
                    ))}
                  </div>

                  {/* Assignment dropdown */}
                  {selectedExtractedColor && (
                    <div className="space-y-3 p-4 bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] border-2 border-[color-mix(in_srgb,var(--primary)_20%,transparent)] rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg border-2 border-white shadow-sm" style={{ backgroundColor: selectedExtractedColor }} />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Selected Color
                          </p>
                          <p className="text-sm font-mono font-bold text-[var(--foreground)]">
                            {selectedExtractedColor}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold text-[var(--foreground)] whitespace-nowrap">Assign to:</Label>
                        <Select
                          onValueChange={(value) => assignColorToField(selectedExtractedColor, value as keyof typeof tempColors)}
                        >
                          <SelectTrigger className="flex-1 h-10 rounded-xl">
                            <SelectValue placeholder="Choose a field..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="primary_color" className="rounded-lg">Primary Color</SelectItem>
                            <SelectItem value="secondary_color" className="rounded-lg">Secondary Color</SelectItem>
                            <SelectItem value="accent_color" className="rounded-lg">Accent Color</SelectItem>
                            <SelectItem value="dark_color" className="rounded-lg">Dark Color</SelectItem>
                            <SelectItem value="light_color" className="rounded-lg">Light Color</SelectItem>
                            <SelectItem value="text_color" className="rounded-lg">Text Color</SelectItem>
                            <SelectItem value="secondary_text_color" className="rounded-lg">Secondary Text Color</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logo Upload */}
            <div className="space-y-3 p-5 bg-[color-mix(in_srgb,var(--muted)_30%,transparent)] border border-[var(--border)] rounded-2xl">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-[var(--foreground)]" />
                <Label htmlFor="logo-upload" className="text-sm font-bold text-[var(--foreground)]">
                  Upload University Logo (Alternative Method)
                </Label>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Upload a logo file to automatically extract dominant colors
              </p>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="h-12 rounded-xl border-[var(--border)] cursor-pointer file:mr-4 file:py-2.5 file:px-5 file:h-10 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[var(--primary)] file:text-black hover:file:bg-[var(--hover-green)] file:cursor-pointer file:transition-all file:duration-200 hover:file:shadow-md"
              />

              {logoFile && extractedColors.length > 0 && (
                <div className="space-y-2 p-4 bg-white border border-[var(--border)] rounded-xl">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Extracted {extractedColors.length} colors from: {logoFile.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Use the extracted colors section above to assign them to fields.
                  </p>
                </div>
              )}
            </div>

            {/* Color Inputs */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-4">
                Manual Color Adjustments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(tempColors).map(([key, value]) => (
                  <div key={key} className="space-y-2 p-4 bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] transition-colors duration-200">
                    <Label htmlFor={key} className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <Input
                          id={key}
                          type="color"
                          value={value}
                          onChange={(e) => setTempColors(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-14 h-14 p-1 rounded-xl cursor-pointer border-2 border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                        />
                      </div>
                      <Input
                        type="text"
                        value={hexInputValues[key as keyof typeof hexInputValues] || ''}
                        onChange={(e) => {
                          let inputValue = e.target.value.toUpperCase();
                          // Only allow hex characters and limit to 6 digits
                          inputValue = inputValue.replace(/[^0-9A-F]/g, '').slice(0, 6);
                          // Update the hex input display value
                          setHexInputValues(prev => ({ ...prev, [key]: inputValue }));
                          // Only update tempColors when we have a complete 6-digit hex code
                          if (inputValue.length === 6) {
                            const hexValue = '#' + inputValue;
                            setTempColors(prev => ({ ...prev, [key]: hexValue }));
                          }
                        }}
                        className="flex-1 h-11 rounded-xl border-[var(--border)] font-mono text-sm font-semibold focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-20"
                        placeholder="FFFFFF"
                        maxLength={6}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3 p-5 bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] border border-[var(--border)] rounded-2xl">
              <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
                Theme Preview
              </h3>
              <div className="space-y-4">
                {/* Button previews */}
                <div className="flex gap-3 flex-wrap items-center">
                  <Button
                    style={{ backgroundColor: tempColors.primary_color }}
                    className="text-white rounded-xl h-11 px-6 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    Primary Button
                  </Button>
                  <Button
                    style={{ backgroundColor: tempColors.secondary_color }}
                    className="text-white rounded-xl h-11 px-6 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    Secondary
                  </Button>
                  <Button
                    style={{ backgroundColor: tempColors.accent_color }}
                    className="text-black rounded-xl h-11 px-6 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    Accent
                  </Button>
                </div>

                {/* Text preview card */}
                <div
                  className="p-5 rounded-xl shadow-sm"
                  style={{
                    backgroundColor: tempColors.light_color,
                    borderLeft: `4px solid ${tempColors.primary_color}`
                  }}
                >
                  <p className="text-base font-semibold mb-2" style={{ color: tempColors.text_color }}>
                    Primary Text Color Example
                  </p>
                  <p className="text-sm" style={{ color: tempColors.secondary_text_color }}>
                    Secondary text color for descriptions and supporting content. This is how muted text will appear throughout the interface.
                  </p>
                </div>

                {/* Color swatches */}
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(tempColors).map(([key, value]) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <div
                        className="w-full aspect-square rounded-lg shadow-sm border-2 border-white"
                        style={{ backgroundColor: value }}
                      />
                      <span className="text-[10px] font-mono text-[var(--muted-foreground)] text-center leading-tight">
                        {key.split('_')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-[var(--border)]">
              <Button
                onClick={handleSaveTheme}
                disabled={isUpdating}
                variant="primary"
                className="flex-1 h-12 rounded-xl"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" strokeWidth={2.5} />
                    Save Changes
                  </>
                )}
              </Button>

              <Button
                onClick={handleApplyAndRedirect}
                disabled={isUpdating}
                variant="secondary"
                className="flex-1 h-12 rounded-xl"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Apply & {process.env.NEXT_PUBLIC_ENV === 'dev' ? 'Reload' : 'Visit Site'}
              </Button>

              <Button
                onClick={handleResetToDefault}
                disabled={isUpdating}
                variant="accent"
                className="h-12 px-6 rounded-xl"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Reset to Default
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Modern toast notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
            <div
              className={`
                ${toastMessage.variant === 'destructive'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_50%,black)] text-black'
                }
                border-2 rounded-2xl p-4 shadow-2xl backdrop-blur-sm
              `}
            >
              <h3 className="font-bold text-base mb-1">{toastMessage.title}</h3>
              {toastMessage.description && (
                <p className="text-sm opacity-90">{toastMessage.description}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
