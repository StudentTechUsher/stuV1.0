"use server";

/**
 * Utility Service
 *
 * Handles miscellaneous utility functions like color extraction
 */

// Custom error types for better error handling
export class ColorExtractionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ColorExtractionError';
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Extracts hex colors from a webpage URL
 * @param url - The URL to extract colors from
 * @returns Array of unique hex colors
 */
export async function extractColorsFromUrl(url: string) {
  try {
    if (!url || typeof url !== 'string') {
      throw new ColorExtractionError('Invalid URL');
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; STU-ColorExtractor/1.0)',
      },
    });

    if (!response.ok) {
      throw new ColorExtractionError(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract hex colors from the HTML
    // Look for patterns like #RRGGBB or #RGB
    const hexPattern = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
    const matches = html.match(hexPattern);

    if (!matches || matches.length === 0) {
      return [];
    }

    // Normalize 3-digit hex to 6-digit and remove duplicates
    const normalizedColors = Array.from(
      new Set(
        matches.map((hex) => {
          const color = hex.toLowerCase();
          // Convert #RGB to #RRGGBB
          if (color.length === 4) {
            return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
          }
          return color;
        })
      )
    );

    // Filter out very common colors (white, black, pure grays)
    const filteredColors = normalizedColors.filter((color) => {
      // Skip pure white, black, and common grays
      if (color === '#ffffff' || color === '#000000') return false;
      if (color === '#f0f0f0' || color === '#e0e0e0' || color === '#cccccc') return false;
      if (color === '#999999' || color === '#888888' || color === '#666666') return false;
      if (color === '#333333' || color === '#111111') return false;

      // Calculate if it's too close to pure gray
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);

      // Skip if R, G, B are too similar (pure gray)
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (maxDiff < 15) return false;

      return true;
    });

    // Return up to 10 unique colors
    return filteredColors.slice(0, 10);
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
