'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';
import { Loader2, Palette, User as UserIcon, Upload, Check, RotateCcw } from 'lucide-react';
import { useState as useToastState } from 'react';

interface Profile {
  id: string;
  role_id: string;
  theme_color?: string;
  [key: string]: any;
}

interface SettingsClientProps {
  user: User;
  profile: Profile;
}

const ROLE_OPTIONS = [
  { value: '1', label: 'Admin' },
  { value: '2', label: 'Advisor' },
  { value: '3', label: 'Student' }
];

export default function SettingsClient({ user, profile }: SettingsClientProps) {
  const [currentRole, setCurrentRole] = useState(profile.role_id || '3');
  const [themeColor, setThemeColor] = useState(profile.theme_color || '#12F987');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [extractedColor, setExtractedColor] = useState<string>('');

  const { updateThemeColor } = useTheme();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Simple toast state
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  } | null>(null);

  const showToast = (message: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    updateThemeColor(themeColor);
  }, [themeColor, updateThemeColor]);

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return;

    setIsUpdatingRole(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: newRole })
        .eq('id', user.id);

      if (error) throw error;

      setCurrentRole(newRole);
      showToast({
        title: "Role Updated",
        description: `Your role has been changed to ${ROLE_OPTIONS.find(r => r.value === newRole)?.label}`,
      });

      // Refresh the page to update navigation and permissions
      router.refresh();
    } catch (error) {
      console.error('Error updating role:', error);
      showToast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleThemeColorChange = async (color: string) => {
    setIsUpdatingTheme(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_color: color })
        .eq('id', user.id);

      if (error) throw error;

      setThemeColor(color);
      updateThemeColor(color);

      showToast({
        title: "Theme Updated",
        description: "Your theme color has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      showToast({
        title: "Error",
        description: "Failed to update theme color. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  const extractDominantColor = async (file: File): Promise<string> => {
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
          if (brightness < 50 || brightness > 200) continue;

          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }

        if (colorMap.size === 0) {
          reject(new Error('No suitable colors found'));
          return;
        }

        // Find the most frequent color
        let dominantColor = '';
        let maxCount = 0;
        for (const [color, count] of colorMap) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
          }
        }

        resolve(dominantColor);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      // Extract dominant color
      const dominantColor = await extractDominantColor(file);
      setExtractedColor(dominantColor);

      // Create a data URL for the logo to store in localStorage for navigation
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoDataUrl = e.target?.result as string;
        localStorage.setItem('schoolLogo', logoDataUrl);

        showToast({
          title: "Logo Uploaded",
          description: `School logo uploaded and color extracted: ${dominantColor}`,
        });
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error processing logo:', error);
      showToast({
        title: "Processing Failed",
        description: "Could not process the logo.",
        variant: "destructive",
      });
    }
  };

  const applyExtractedColor = () => {
    if (extractedColor) {
      setThemeColor(extractedColor);
      handleThemeColorChange(extractedColor);
    }
  };

  const resetToDefault = async () => {
    const defaultColor = '#12F987';

    setIsUpdatingTheme(true);
    try {
      // Update theme color in database
      const { error } = await supabase
        .from('profiles')
        .update({ theme_color: defaultColor })
        .eq('id', user.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update local state first
      setThemeColor(defaultColor);

      // Apply theme color directly to avoid timing issues
      updateThemeColor(defaultColor);

      // Remove logo from localStorage
      localStorage.removeItem('schoolLogo');

      // Clear logo file and extracted color
      setLogoFile(null);
      setExtractedColor('');

      // Clear file input
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      showToast({
        title: "Reset to Default",
        description: "Theme color reset to standard green and logo removed.",
      });

      // Refresh the page to ensure all components reflect the reset
      setTimeout(() => {
        router.refresh();
      }, 500);

    } catch (error) {
      console.error('Error resetting to default:', error);
      showToast({
        title: "Error",
        description: `Failed to reset to default: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  return (
  <div className="px-4 sm:px-6 md:px-8 max-w-screen-lg mx-auto space-y-6">
      {/* Role Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            User Role
          </CardTitle>
          <CardDescription>
            Change your role in the system. This affects your permissions and available features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-select">Current Role</Label>
            <Select value={currentRole} onValueChange={handleRoleChange} disabled={isUpdatingRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isUpdatingRole && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating role...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Customization
            </div>
            <Button
              onClick={resetToDefault}
              disabled={isUpdatingTheme}
              variant="outline"
              size="sm"
            >
              {isUpdatingTheme ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset to Default
            </Button>
          </CardTitle>
          <CardDescription>
            Customize the primary theme color for your interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manual Color Input */}
          <div className="space-y-4">
            <Label htmlFor="theme-color">Primary Color</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="theme-color"
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-16 h-10 p-1 rounded cursor-pointer"
              />
              <Input
                type="text"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#12F987"
                className="flex-1"
              />
              <Button
                onClick={() => handleThemeColorChange(themeColor)}
                disabled={isUpdatingTheme || themeColor === profile.theme_color}
                size="sm"
              >
                {isUpdatingTheme ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Apply
              </Button>
            </div>
          </div>

          {/* Logo Upload for Color Extraction */}
          <div className="space-y-4">
            <Label htmlFor="logo-upload">Extract Color from Logo</Label>
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

              {logoFile && extractedColor && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: extractedColor }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Extracted Color: {extractedColor}</p>
                    <p className="text-xs text-muted-foreground">From: {logoFile.name}</p>
                  </div>
                  <Button
                    onClick={applyExtractedColor}
                    size="sm"
                    variant="outline"
                  >
                    Use This Color
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Color Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex gap-2">
                <Button style={{ backgroundColor: themeColor }} className="text-white">
                  Primary Button
                </Button>
                <Button variant="outline" style={{ borderColor: themeColor, color: themeColor }}>
                  Outline Button
                </Button>
              </div>
              <div
                className="text-sm p-2 rounded"
                style={{ backgroundColor: `${themeColor}15`, borderLeft: `3px solid ${themeColor}` }}
              >
                This is how your theme color will look in the interface
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}