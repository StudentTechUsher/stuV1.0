'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Search,
    GraduationCap,
    CalendarDays,
    BarChart3,
    Users,
    Briefcase,
    Building2,
    Settings,
    ArrowRight,
    ExternalLink,
    Wallet,
    ArrowRightLeft,
    Network
} from 'lucide-react';

// --- Types ---

type ServiceCategory = 'All' | 'Student Success' | 'Advising & Faculty' | 'Administration' | 'Beta';

interface ServiceItem {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    category: ServiceCategory;
    isBeta?: boolean;
}

// --- Data ---

const SERVICES: ServiceItem[] = [
    // Student Success
    {
        id: 'grad-planning',
        title: 'Intuitive Grad Planning',
        description: 'Map your entire degree path from freshman year to graduation. Check requirements and stay on track.',
        icon: <GraduationCap className="h-6 w-6" />,
        href: '/grad-plan',
        category: 'Student Success',
    },
    {
        id: 'scheduler',
        title: 'Course Scheduling',
        description: 'Build your perfect semester schedule. visualize conflicts, and register for classes in one click.',
        icon: <CalendarDays className="h-6 w-6" />,
        href: '/course-scheduler',
        category: 'Student Success',
    },
    {
        id: 'career-pathways',
        title: 'Career Pathways',
        description: 'Explore how your major connects to real-world careers and see job outlook data.',
        icon: <Briefcase className="h-6 w-6" />,
        href: '/careers',
        category: 'Student Success',
    },
    // Advising & Faculty
    {
        id: 'caseload',
        title: 'Caseload Management',
        description: 'Manage your advisee roster, track student progress, and identify at-risk students.',
        icon: <Users className="h-6 w-6" />,
        href: '/advisees',
        category: 'Advising & Faculty',
    },
    {
        id: 'forecasting',
        title: 'Course Forecasting',
        description: 'Predict course demand based on student degree plans to optimize seat availability.',
        icon: <BarChart3 className="h-6 w-6" />,
        href: '/admin/forecast',
        category: 'Advising & Faculty',
    },
    {
        id: 'appointments',
        title: 'Appointments',
        description: 'Schedule and manage advising appointments with automated reminders and calendar sync.',
        icon: <CalendarDays className="h-6 w-6" />,
        href: '/appointments',
        category: 'Advising & Faculty',
    },
    // Administration
    {
        id: 'program-mgmt',
        title: 'Program Management',
        description: 'Define and update degree requirements, core curriculums, and elective pools.',
        icon: <Building2 className="h-6 w-6" />,
        href: '/maintain-programs',
        category: 'Administration',
    },
    {
        id: 'system-settings',
        title: 'System Settings',
        description: 'Configure global platform settings, user roles, and integration parameters.',
        icon: <Settings className="h-6 w-6" />,
        href: '/admin/settings',
        category: 'Administration',
    },
    // Beta / Coming Soon
    {
        id: 'financial-aid',
        title: 'Financial Aid Estimator',
        description: 'Estimate costs and view available financial aid packages tailored to your profile.',
        icon: <Wallet className="h-6 w-6" />,
        href: '#',
        category: 'Beta',
        isBeta: true,
    },
    {
        id: 'transfer-portal',
        title: 'Transfer Equivalency',
        description: 'Instantly see how credits from other institutions transfer to your current program.',
        icon: <ArrowRightLeft className="h-6 w-6" />,
        href: '#',
        category: 'Beta',
        isBeta: true,
    },
    {
        id: 'alumni-connect',
        title: 'Alumni Connect',
        description: 'Connect with alumni from your major for mentorship and networking opportunities.',
        icon: <Network className="h-6 w-6" />,
        href: '#',
        category: 'Beta',
        isBeta: true,
    },
];

const CATEGORIES: ServiceCategory[] = ['All', 'Student Success', 'Advising & Faculty', 'Administration', 'Beta'];

export function ServicesSection() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('All');

    // Filter Logic
    const filteredServices = SERVICES.filter((service) => {
        const matchesSearch =
            service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    return (
        <section
            id="catalog"
            className="relative z-10 -mt-10 md:-mt-14 rounded-t-[2.5rem] md:rounded-t-[3rem] overflow-hidden border-b border-border/60 py-18 md:py-30 bg-slate-50 dark:bg-slate-900/50 scroll-mt-28"
        >
            <div className="container mx-auto px-4 md:px-8 max-w-7xl">
                {/* Section Header */}
                <div className="max-w-4xl mx-auto mb-16 text-center space-y-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Service Catalog</p>
                    <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                        Explore the Platform
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                        Access all your academic planning, scheduling, and advising tools from one central hub.
                    </p>

                    <div className="relative max-w-lg mx-auto mt-8">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search services (e.g., 'Grad Plan', 'Grades')..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-center mt-4">
                    <Link href="/services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                        View full catalog page <ExternalLink className="h-3 w-3" />
                    </Link>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat
                                ? 'bg-foreground text-background shadow-md'
                                : 'bg-white dark:bg-slate-800 text-muted-foreground hover:bg-muted border border-border/40'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group relative flex flex-col bg-white dark:bg-slate-900 border border-border/60 rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-200"
                        >
                            {/* Icon Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-muted/50 rounded-xl text-primary group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                    {service.icon}
                                </div>
                                {service.isBeta && (
                                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                                        Beta
                                    </span>
                                )}
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors text-foreground">
                                {service.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 flex-1 leading-relaxed">
                                {service.description}
                            </p>

                            {/* Action */}
                            <div className="mt-auto pt-4 border-t border-border/40">
                                {service.isBeta ? (
                                    <span className="text-sm font-medium text-muted-foreground cursor-not-allowed flex items-center">
                                        Coming Soon
                                    </span>
                                ) : (
                                    <Link
                                        href={service.href}
                                        className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors gap-1 group/link"
                                    >
                                        Launch Service
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredServices.length === 0 && (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 text-muted-foreground">
                            <Search className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">No services found</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                            We couldn't find any services matching "{searchQuery}". Try a different search term or category.
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                            className="mt-6 text-primary font-medium hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
