import Image from 'next/image';

export default function PathfinderPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Image
          src="/coming_soon.png"
          alt="Coming Soon"
          width={400}
          height={300}
          className="max-w-full h-auto"
          priority
        />
        <h1 className="text-2xl font-semibold text-gray-700 text-center">
          Pathfinder
        </h1>
        <p className="text-gray-500 text-center max-w-md">
          This feature is currently under development. Check back soon!
        </p>
      </div>
    </div>
  );
}
