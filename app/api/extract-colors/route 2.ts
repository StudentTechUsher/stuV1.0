import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; STU-ColorExtractor/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract hex colors from the HTML
    // Look for patterns like #RRGGBB or #RGB
    const hexPattern = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
    const matches = html.match(hexPattern);

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        error: 'No colors found',
        colors: []
      }, { status: 404 });
    }

    // Normalize 3-digit hex to 6-digit and remove duplicates
    const normalizedColors = Array.from(new Set(
      matches.map(hex => {
        const color = hex.toLowerCase();
        // Convert #RGB to #RRGGBB
        if (color.length === 4) {
          return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
        }
        return color;
      })
    ));

    // Filter out very common colors (white, black, pure grays)
    const filteredColors = normalizedColors.filter(color => {
      // Skip pure white, black, and common grays
      if (color === '#ffffff' || color === '#000000') return false;
      if (color === '#f0f0f0' || color === '#e0e0e0' || color === '#cccccc') return false;
      if (color === '#999999' || color === '#888888' || color === '#666666') return false;
      if (color === '#333333' || color === '#111111') return false;

      // Calculate if it's too close to pure gray
      const r = parseInt(color.substr(1, 2), 16);
      const g = parseInt(color.substr(3, 2), 16);
      const b = parseInt(color.substr(5, 2), 16);

      // Skip if R, G, B are too similar (pure gray)
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (maxDiff < 15) return false;

      return true;
    });

    // Return up to 10 unique colors
    const uniqueColors = filteredColors.slice(0, 10);

    return NextResponse.json({
      colors: uniqueColors,
      total: uniqueColors.length
    });

  } catch (error) {
    console.error('Error extracting colors:', error);
    return NextResponse.json(
      { error: 'Failed to extract colors', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
