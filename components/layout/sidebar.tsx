'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUniversityTheme } from '@/contexts/university-theme-context';
import { useDarkMode } from '@/contexts/dark-mode-context';

// Icons from lucide-react
import {
  LayoutDashboard,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MapPin,
  Clock,
  Users,
  CheckSquare,
  Zap,
  Calendar,
  UserCheck,
  Building2,
  Briefcase,
  Moon,
  Sun,
  Bot,
  type LucideIcon,
} from 'lucide-react';

import type { NavItem as BaseNavItem } from '@/app/(dashboard)/layout';

export type NavItem = BaseNavItem & {
  section: 'primary' | 'secondary' | 'bottom';
};

const SIDEBAR_STORAGE_KEY = 'stu-sidebar-expanded';
const COLLAPSED_WIDTH = 70;
const EXPANDED_WIDTH = 260;
const ICON_SIZE = 20;

// Map icon names to lucide components
const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  inbox: Inbox,
  planner: GraduationCap,
  map: MapPin,
  semester: Calendar,
  history: Clock,
  meet: Calendar,
  profile: Users,
  advisees: UserCheck,
  advisors: Users,
  appointments: Calendar,
  reports: BarChart3,
  users: Users,
  programs: Building2,
  system: Settings,
  forecast: BarChart3,
  careers: Briefcase,
  programFlow: Zap,
  sandbox: CheckSquare,
};

interface SidebarProps {
  items: NavItem[];
  onSignOut: () => void;
  role?: 'student' | 'advisor' | 'admin';
  onOpenChat?: () => void;
}

export function Sidebar({ items, onSignOut, role, onOpenChat }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { university } = useUniversityTheme();
  const { isDark, setMode } = useDarkMode();

  // Load persisted state on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    }
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isExpanded));
    }
  }, [isExpanded, mounted]);

  // Group items by section
  const groupedItems = useMemo(() => {
    return {
      primary: items.filter(item => item.section === 'primary'),
      secondary: items.filter(item => item.section === 'secondary'),
    };
  }, [items]);

  const sidebarWidth = isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Sidebar */}
      <nav
        className={`fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-200 ease-out cursor-pointer`}
        style={{ width: `${sidebarWidth}px` }}
        aria-label="Main navigation"
        data-sidebar-width={sidebarWidth}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Don't toggle if clicking on interactive elements (links, buttons, icon spans)
          const isInteractive = target.closest('a') || target.closest('button') || target.closest('span[role="tooltip"]');
          if (!isInteractive) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] to-[#050816] dark:from-[#020617] dark:to-[#050816] light:from-white light:to-slate-50 border-r border-slate-800/40 dark:border-slate-800/40 light:border-slate-200/60" />

        {/* Content */}
        <div className="relative flex flex-col h-full">
          {/* ─────────────────────────────────────────────────────────────
              TOP SECTION: Logo + Collapse/Expand Control
              ───────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3.5 py-5 flex-shrink-0 border-b border-slate-800/30 dark:border-slate-800/30 light:border-slate-200/50">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 hover:opacity-75 transition-opacity duration-200"
              aria-label="STU Home"
            >
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-lg bg-slate-800/30 dark:bg-slate-800/30 light:bg-slate-200/40 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-slate-200/60 transition-colors">
                <Image
                  src="/stu_icon_black.png"
                  alt="STU Logo"
                  width={24}
                  height={24}
                  style={{ filter: 'invert(1)' }}
                  priority
                />
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold text-slate-50 dark:text-slate-50 light:text-slate-900 leading-tight">STU</span>
                  {university?.name && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-600 leading-tight truncate">
                      {university.name.split(' ')[0]}
                    </span>
                  )}
                </div>
              )}
            </Link>

            {/* Collapse Button (only in expanded) */}
            {isExpanded && (
              <button
                onClick={toggleExpand}
                className="p-1.5 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-slate-200/50 rounded-lg transition-colors duration-200 flex-shrink-0 text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-300 dark:hover:text-slate-300 light:hover:text-slate-700"
                aria-label="Collapse sidebar"
                aria-expanded={isExpanded}
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PRIMARY NAVIGATION
              ───────────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto overflow-x-visible px-2 py-4 space-y-0.5">
            {isExpanded && (
              <div className="px-4 py-3 mb-3">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 light:text-slate-600 uppercase tracking-wider">
                  Navigation
                </span>
              </div>
            )}

            <ul className="space-y-1">
              {groupedItems.primary.map(item => (
                <li key={item.href}>
                  <NavItem
                    item={item}
                    isActive={pathname === item.href}
                    isExpanded={isExpanded}
                    isDark={isDark}
                  />
                </li>
              ))}
            </ul>

            {/* ─────────────────────────────────────────────────────────────
                SECONDARY NAVIGATION
                ───────────────────────────────────────────────────────────── */}
            {groupedItems.secondary.length > 0 && (
              <>
                {isExpanded && (
                  <div className="px-4 py-3 mt-6 mb-3">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 light:text-slate-600 uppercase tracking-wider">
                      Admin
                    </span>
                  </div>
                )}

                <ul className="space-y-1">
                  {groupedItems.secondary.map(item => (
                    <li key={item.href}>
                      <NavItem
                        item={item}
                        isActive={pathname === item.href}
                        isExpanded={isExpanded}
                        isDark={isDark}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BOTTOM SECTION: Settings + Sign Out
              ───────────────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-t border-slate-800/30 dark:border-slate-800/30 light:border-slate-200/50 px-2 py-5 space-y-1">
            {isExpanded && (
              <div className="px-4 py-3 mb-2">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 light:text-slate-600 uppercase tracking-wider">
                  Account
                </span>
              </div>
            )}

            <ul className="space-y-1">
              {/* AI Assistant (only for students) */}
              {role === 'student' && onOpenChat && (
                <li>
                  <AIAssistantButton
                    onClick={onOpenChat}
                    isExpanded={isExpanded}
                    isDark={isDark}
                  />
                </li>
              )}

              {/* Settings */}
              <li>
                <NavItem
                  item={{
                    label: 'Settings',
                    icon: 'system',
                    href: '/settings',
                    segment: 'settings',
                    section: 'bottom',
                  }}
                  isActive={pathname === '/settings'}
                  isExpanded={isExpanded}
                  isDark={isDark}
                />
              </li>

              {/* Dark Mode Toggle */}
              <li>
                <ThemeModeToggle isExpanded={isExpanded} />
              </li>

              {/* Sign Out Button */}
              <li>
                <button
                  onClick={onSignOut}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-150 min-h-[40px] ${
                    isExpanded ? '' : 'justify-center'
                  } text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-800 hover:bg-slate-800/40 dark:hover:bg-slate-800/40 light:hover:bg-slate-200/30 focus:outline-none focus:ring-2 focus:ring-[#12F987]/50 focus:ring-offset-2 dark:focus:ring-offset-[#020617] light:focus:ring-offset-white`}
                  aria-label="Sign out"
                >
                  <LogOut size={ICON_SIZE} className="flex-shrink-0" />
                  {isExpanded && <span className="text-sm font-medium">Sign Out</span>}
                </button>
              </li>

              {/* Expand Button (only in collapsed) */}
              {!isExpanded && (
                <li>
                  <button
                    onClick={toggleExpand}
                    className="w-full flex items-center justify-center px-3.5 py-3 rounded-lg transition-all duration-150 min-h-[40px] text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-800 hover:bg-slate-800/40 dark:hover:bg-slate-800/40 light:hover:bg-slate-200/30 focus:outline-none focus:ring-2 focus:ring-[#12F987]/50 focus:ring-offset-2 dark:focus:ring-offset-[#020617] light:focus:ring-offset-white"
                    aria-label="Expand sidebar"
                    aria-expanded={isExpanded}
                  >
                    <ChevronRight size={ICON_SIZE} className="flex-shrink-0" />
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Content offset spacer */}
      <div style={{ width: `${sidebarWidth}px` }} className="transition-all duration-200 ease-out" />
    </>
  );
}

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  isDark: boolean;
}

function NavItem({ item, isActive, isExpanded, isDark }: NavItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const itemRef = useRef<HTMLDivElement>(null);
  const IconComponent = iconMap[item.icon] || LayoutDashboard;

  useEffect(() => {
    if (isHovered && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  }, [isHovered]);

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-150 min-h-[40px] ${
          isExpanded ? '' : 'justify-center'
        } ${
          isActive
            ? 'bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200/60 text-[#12F987]'
            : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-800 hover:bg-slate-800/40 dark:hover:bg-slate-800/40 light:hover:bg-slate-200/30'
        } focus:outline-none focus:ring-2 focus:ring-[#12F987]/50 focus:ring-offset-2 dark:focus:ring-offset-[#020617] light:focus:ring-offset-white`}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Left accent bar (only in collapsed and when active) */}
        {isActive && !isExpanded && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#12F987] rounded-r-full" />
        )}

        {/* Icon with notification bubble */}
        <span className="flex-shrink-0 flex items-center justify-center relative">
          <IconComponent size={ICON_SIZE} />
          {/* Tiny notification bubble (only in collapsed mode) */}
          {!isExpanded && item.badgeCount && item.badgeCount > 0 && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full" />
          )}
        </span>

        {/* Label */}
        {isExpanded && (
          <span className="text-sm font-medium flex-1 whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
            {item.label}
          </span>
        )}

        {/* Badge (only in expanded mode) */}
        {isExpanded && item.badgeCount && item.badgeCount > 0 && (
          <span className="flex-shrink-0 ml-auto bg-red-600/80 text-red-50 text-[10px] font-bold px-2 py-0.5 rounded">
            {item.badgeCount > 99 ? '99+' : item.badgeCount}
          </span>
        )}
      </Link>

      {/* Tooltip (appears on hover - rendered via portal to avoid overflow clipping) */}
      {isHovered && !isExpanded &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 dark:border-slate-700 light:border-slate-200 text-slate-50 dark:text-slate-50 light:text-slate-900 text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none"
            role="tooltip"
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: 'translateY(-50%)',
              zIndex: 9999,
              boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
          >
            {item.label}
          </div>,
          document.body
        )}
    </div>
  );
}

interface ThemeModeToggleProps {
  isExpanded: boolean;
}

interface AIAssistantButtonProps {
  onClick: () => void;
  isExpanded: boolean;
  isDark: boolean;
}

function AIAssistantButton({ onClick, isExpanded, isDark }: AIAssistantButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isHovered && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  }, [isHovered]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        ref={buttonRef}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-all duration-150 min-h-[40px] ${
          isExpanded ? '' : 'justify-center'
        } text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-800 hover:bg-slate-800/40 dark:hover:bg-slate-800/40 light:hover:bg-slate-200/30 focus:outline-none focus:ring-2 focus:ring-[#12F987]/50 focus:ring-offset-2 dark:focus:ring-offset-[#020617] light:focus:ring-offset-white`}
        aria-label="AI Assistant"
      >
        <Bot size={ICON_SIZE} className="flex-shrink-0" />
        {isExpanded && <span className="text-sm font-medium">AI Assistant</span>}
      </button>

      {/* Tooltip (appears on hover in collapsed mode) */}
      {isHovered && !isExpanded &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 dark:border-slate-700 light:border-slate-200 text-slate-50 dark:text-slate-50 light:text-slate-900 text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none"
            role="tooltip"
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: 'translateY(-50%)',
              zIndex: 9999,
              boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
          >
            AI Assistant
          </div>,
          document.body
        )}
    </div>
  );
}

function ThemeModeToggle({ isExpanded }: ThemeModeToggleProps) {
  const { isDark, setMode } = useDarkMode();
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  }, [isHovered]);

  const handleToggle = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  if (!isExpanded) {
    // Collapsed mode: simple icon button
    return (
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={handleToggle}
          className={`w-full flex items-center justify-center px-3.5 py-3 rounded-lg transition-all duration-150 min-h-[40px] text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-slate-800 hover:bg-slate-800/40 dark:hover:bg-slate-800/40 light:hover:bg-slate-200/30 focus:outline-none focus:ring-2 focus:ring-[#12F987]/50 focus:ring-offset-2 dark:focus:ring-offset-[#020617] light:focus:ring-offset-white`}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Moon size={ICON_SIZE} className="flex-shrink-0" />
          ) : (
            <Sun size={ICON_SIZE} className="flex-shrink-0" />
          )}
        </button>

        {/* Tooltip for collapsed mode */}
        {isHovered &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 dark:border-slate-700 light:border-slate-200 text-slate-50 dark:text-slate-50 light:text-slate-900 text-sm font-semibold px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none"
              role="tooltip"
              style={{
                top: `${tooltipPos.top}px`,
                left: `${tooltipPos.left}px`,
                transform: 'translateY(-50%)',
                zIndex: 9999,
                boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.1)',
              }}
            >
              {isDark ? 'Dark' : 'Light'} Mode
            </div>,
            document.body
          )}
      </div>
    );
  }

  // Expanded mode: slider with labels
  return (
    <div
      ref={containerRef}
      className="w-full px-3.5 py-3 flex items-center justify-between min-h-[40px]"
    >
      {/* Light/Dark labels */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Sun size={14} className="text-amber-500" />
          <span>Light</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Moon size={14} className="text-slate-400" />
          <span>Dark</span>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={handleToggle}
        className={`relative inline-flex items-center h-7 rounded-full transition-all duration-200 flex-shrink-0 ${
          isDark
            ? 'bg-slate-700 dark:bg-slate-700'
            : 'bg-slate-300 light:bg-slate-300'
        } focus:outline-none focus:ring-2 focus:ring-[#12F987]/50 focus:ring-offset-2 dark:focus:ring-offset-[#020617] light:focus:ring-offset-white`}
        style={{ width: '50px' }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        role="switch"
        aria-checked={isDark}
      >
        {/* Slider background */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 light:from-slate-200 light:to-slate-300 opacity-0" />

        {/* Toggle circle */}
        <div
          className={`absolute w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 flex items-center justify-center ${
            isDark ? 'translate-x-[26px]' : 'translate-x-0.5'
          }`}
        >
          {isDark ? (
            <Moon size={14} className="text-slate-900" />
          ) : (
            <Sun size={14} className="text-amber-500" />
          )}
        </div>
      </button>
    </div>
  );
}
