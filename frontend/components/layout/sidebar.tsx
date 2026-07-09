'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  Cpu,
  FileText,
  Database
} from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function PulseSidebar() {
  const pathname = usePathname();

  const links: NavLink[] = [
    {
      label: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: "PMGSY Dashboard",
      href: "/applications",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      label: "Live Sensors",
      href: "/live-signals",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      label: "Distresses",
      href: "/anomalies",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      label: "Agent Pipeline",
      href: "/agent-decisions",
      icon: <Brain className="w-5 h-5" />,
    },
    {
      label: "Visual Feed",
      href: "/context",
      icon: <Camera className="w-5 h-5" />,
    },
    {
      label: "Pipeline Data",
      href: "/pipeline-data",
      icon: <Database className="w-5 h-5" />,
    },
    {
      label: "System Health",
      href: "/system-health",
      icon: <Cpu className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      className="hidden md:flex flex-col h-screen sticky top-0 w-20 border-r"
      style={{
        background: 'rgba(10, 10, 10, 0.7)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderColor: 'rgba(212, 192, 142, 0.15)'
      }}
    >
      {/* Logo Section */}
      <div className="p-5 flex items-center justify-center">
        <Link href="/">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D4C08E 0%, #B8A577 100%)' }}
          >
            <Activity className="w-5 h-5 text-black" />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center justify-center p-3 rounded-xl",
                    isActive
                      ? "bg-gradient-to-r from-[#D4C08E]/20 to-[#D4C08E]/10"
                      : "hover:bg-white/5"
                  )}
                  style={{
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 12px rgba(212, 192, 142, 0.2)' : 'none'
                  }}
                  title={link.label}
                >
                  <span style={{ color: isActive ? '#D4C08E' : 'var(--text-secondary)' }}>
                    {link.icon}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        className="p-4 border-t flex justify-center"
        style={{ borderColor: 'rgba(212, 192, 142, 0.15)' }}
      >
        <Activity className="w-4 h-4" style={{ color: '#D4C08E' }} />
      </div>
    </aside>
  );
}