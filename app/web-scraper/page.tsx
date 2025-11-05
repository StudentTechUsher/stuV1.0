import WebScraperClient from './web-scraper-client';

export const metadata = {
  title: 'College Contact Scraper',
  description: 'Discover registrar and provost contacts for colleges and universities using Gemini AI.',
};

export default function WebScraperPage() {
  return <WebScraperClient />;
}
