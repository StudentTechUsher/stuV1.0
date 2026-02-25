'use client';

import React from 'react';
import { ServicesSection } from '@/components/landing/services-section';
import Link from 'next/link';
import Image from 'next/image';

export default function ServicesPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Recreating a simple header for the standalone page context */}
            <header className="sticky top-0 z-30 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="h-8 w-8 relative overflow-hidden rounded-md">
                            <Image src="/favicon-96x96.png" alt="Logo" fill className="object-cover" />
                        </div>
                        <span>stu. <span className="text-slate-500 font-normal">Services</span></span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/" className="text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">Dashboard</Link>
                    </nav>
                </div>
            </header>

            <main>
                <ServicesSection />
            </main>
        </div>
    );
}
