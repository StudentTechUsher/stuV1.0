import CareerEditPageClient from '@/components/pathfinder/CareerEditPageClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CareerEditPage({ params }: Readonly<PageProps>) {
  const { slug } = await params;
  return <CareerEditPageClient slug={slug} />;
}
