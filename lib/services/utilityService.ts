/**
 * Utility Service
 *
 * Handles miscellaneous utility functions like color extraction
 */

import { ColorExtractionError } from './errors/utilityErrors';


/**
 * AUTHORIZATION: PUBLIC
 * Extracts dominant colors from a webpage by taking a screenshot
 * @param url - The URL to extract colors from
 * @param numColors - Optional number of colors to return (default: 10)
 * @returns Array of unique hex colors sorted by prominence
 */
export async function extractColorsFromUrl(url: string, numColors = 10) {
  try {
    if (!url || typeof url !== 'string') {
      throw new ColorExtractionError('Invalid URL');
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new ColorExtractionError('Invalid URL format');
    }

    // Fetch the webpage with better headers
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': parsedUrl.origin,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        if (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError') {
          throw new ColorExtractionError('Request timed out. The website may be slow or blocking automated requests.');
        }
        throw new ColorExtractionError(`Failed to fetch URL: ${fetchError.message}`);
      }
      throw new ColorExtractionError('Failed to fetch URL');
    }

    if (!response.ok) {
      throw new ColorExtractionError(`Failed to fetch URL: ${response.status} ${response.statusText}. The website may be blocking automated requests.`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      throw new ColorExtractionError('URL does not point to an HTML page');
    }

    const html = await response.text();

    // Extract colors from multiple sources
    const colorSet = new Set<string>();

    // 1. Extract hex colors (#RRGGBB and #RGB)
    const hexPattern = /#([0-9A-Fa-f]{6})\b/g;
    let match;
    while ((match = hexPattern.exec(html)) !== null) {
      colorSet.add(match[1]);
    }

    // 2. Extract 3-digit hex colors
    const shortHexPattern = /#([0-9A-Fa-f]{3})\b/g;
    while ((match = shortHexPattern.exec(html)) !== null) {
      colorSet.add(match[1]);
    }

    // 3. Extract RGB/RGBA colors with flexible spacing
    const rgbPattern = /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)|rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/gi;
    while ((match = rgbPattern.exec(html)) !== null) {
      // Get the RGB values (either from rgb or rgba groups)
      const r = parseInt(match[1] || match[4]);
      const g = parseInt(match[2] || match[5]);
      const b = parseInt(match[3] || match[6]);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const hex = [r, g, b]
          .map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
        colorSet.add(hex);
      }
    }

    // 4. Extract colors from data attributes and style attributes
    const styleAttrPattern = /style\s*=\s*["']([^"']*["'][^"']*)*["']/gi;
    while ((match = styleAttrPattern.exec(html)) !== null) {
      // Extract colors from the style attribute content
      const styleContent = match[1] || match[0];
      const colorMatches = styleContent.match(/#[0-9A-Fa-f]{3,6}/g) || [];
      colorMatches.forEach(color => {
        colorSet.add(color.substring(1).toUpperCase());
      });
    }

    if (colorSet.size === 0) {
      throw new ColorExtractionError('No colors found on the page');
    }

    // Normalize all colors to 6-digit hex and count occurrences
    const colorFrequency = new Map<string, number>();

    for (const color of colorSet) {
      let normalized = color.toLowerCase();
      // Convert #RGB to #RRGGBB
      if (normalized.length === 3) {
        normalized = `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`;
      }
      const withHash = `#${normalized}`;
      colorFrequency.set(withHash, (colorFrequency.get(withHash) || 0) + 1);
    }

    // If no colors found after normalization, try less strict filtering
    if (colorFrequency.size === 0) {
      throw new ColorExtractionError('No valid colors extracted from the page');
    }

    // Filter out very common/boring colors and prioritize vibrant ones
    const colorScores = Array.from(colorFrequency.entries()).map(([color, frequency]) => {
      // Parse RGB values
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);

      // Calculate brightness
      const brightness = (r + g + b) / 3;

      // Calculate saturation/vibrancy (how colorful vs grayscale)
      const maxChannel = Math.max(r, g, b);
      const minChannel = Math.min(r, g, b);
      const saturation = maxChannel === minChannel ? 0 : (maxChannel - minChannel) / maxChannel;

      // Calculate contrast from middle gray (128, 128, 128)
      const contrast = Math.abs(brightness - 128) / 128;

      // Skip if R, G, B are too similar (pure gray)
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (maxDiff < 15) return { color, score: -999 };

      // Skip very light colors (close to white)
      if (brightness > 245) return { color, score: -999 };

      // Skip very dark colors (close to black)
      if (brightness < 15) return { color, score: -999 };

      // Skip pure white, black, and common grays
      const commonGrays = ['#ffffff', '#000000', '#f0f0f0', '#e0e0e0', '#cccccc', '#999999', '#888888', '#666666', '#333333', '#111111', '#222222'];
      if (commonGrays.includes(color)) return { color, score: -999 };

      // Calculate score: frequency weighted with vibrancy
      // Vibrant colors (high saturation) score higher, plus frequency bonus
      const vibrancyBonus = saturation * 50; // Boost for colorful colors
      const contrastBonus = contrast * 20; // Boost for colors that stand out
      const frequencyBonus = Math.min(frequency * 2, 30); // Diminishing returns on frequency

      const score = vibrancyBonus + contrastBonus + frequencyBonus;

      return { color, score };
    })
      .filter(({ score }) => score > -999)
      .sort((a, b) => b.score - a.score)
      .map(({ color }) => color);

    // Return up to numColors unique colors
    return colorScores.slice(0, numColors);
  } catch (error) {
    if (error instanceof ColorExtractionError) {
      throw error;
    }
    throw new ColorExtractionError(
      error instanceof Error ? error.message : 'Failed to extract colors',
      error
    );
  }
}
