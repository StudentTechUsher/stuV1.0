/**
 * Utility Service
 *
 * Handles miscellaneous utility functions like color extraction
 */

import { ColorExtractionError } from './errors/utilityErrors';

/**
 * AUTHORIZATION: PUBLIC
 * Extracts hex colors from a webpage URL
 * @param url - The URL to extract colors from
 * @param numColors - Optional number of colors to return (default: 10)
 * @returns Array of unique hex colors
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

    // Fetch the webpage with better headers to avoid blocking
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

    // 1. Extract from inline styles (style="color: #...")
    const inlineStylePattern = /style=["'][^"']*?(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*#([0-9A-Fa-f]{3,6})/gi;
    let match;
    while ((match = inlineStylePattern.exec(html)) !== null) {
      colorSet.add(match[1]);
    }

    // 2. Extract from CSS rules
    const cssColorPattern = /(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*#([0-9A-Fa-f]{3,6})/gi;
    while ((match = cssColorPattern.exec(html)) !== null) {
      colorSet.add(match[1]);
    }

    // 3. Extract any standalone hex colors
    const hexPattern = /#([0-9A-Fa-f]{6})\b/g;
    while ((match = hexPattern.exec(html)) !== null) {
      colorSet.add(match[1]);
    }

    // 4. Extract 3-digit hex colors
    const shortHexPattern = /#([0-9A-Fa-f]{3})\b/g;
    while ((match = shortHexPattern.exec(html)) !== null) {
      colorSet.add(match[1]);
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

    // Filter out very common/boring colors
    const filteredColors = Array.from(colorFrequency.entries())
      .filter(([color]) => {
        // Skip pure white, black, and common grays
        if (color === '#ffffff' || color === '#000000') return false;
        if (color === '#f0f0f0' || color === '#e0e0e0' || color === '#cccccc') return false;
        if (color === '#999999' || color === '#888888' || color === '#666666') return false;
        if (color === '#333333' || color === '#111111' || color === '#222222') return false;

        // Calculate if it's too close to pure gray
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);

        // Skip if R, G, B are too similar (pure gray)
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        if (maxDiff < 20) return false;

        // Skip very light colors (close to white)
        const brightness = (r + g + b) / 3;
        if (brightness > 240) return false;

        // Skip very dark colors (close to black)
        if (brightness < 20) return false;

        return true;
      })
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([color]) => color);

    // Return up to numColors unique colors
    return filteredColors.slice(0, numColors);
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
