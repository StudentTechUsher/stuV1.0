import { MetadataRoute } from 'next';

/**
 * Dynamic sitemap generation for stuplanning.com
 * This tells search engines about all publicly accessible pages
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://stuplanning.com';

  // Public pages that should be indexed
  const routes = [
    '',
    '/about-us',
    '/students',
    '/how-it-works',
    '/demo',
    '/privacy-policy',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1.0 : route === '/demo' ? 0.9 : 0.8,
  }));
}
