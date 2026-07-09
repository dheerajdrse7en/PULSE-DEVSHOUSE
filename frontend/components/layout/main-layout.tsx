'use client';

import { useEffect } from 'react';
import { PulseSidebar } from './sidebar';
import { Header } from './header';
import { usePulseStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { EtheralShadow } from '@/components/ui/etheral-shadow';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function MainLayout({ children, title, description }: MainLayoutProps) {
  const {
    startPolling,
    isConnected
  } = usePulseStore();

  useEffect(() => {
    const cleanup = startPolling();
    return () => {
      if (cleanup) cleanup();
    };
  }, [startPolling]);

  return (
    <div className="min-h-screen relative">
      {/* MDBC Etheral Shadow Animated Background */}
      <div className="fixed inset-0 z-0">
        <EtheralShadow
          color="rgba(128, 128, 128, 1)"
          animation={{ scale: 100, speed: 90 }}
          noise={{ opacity: 1, scale: 1.2 }}
          sizing="fill"
          className="w-full h-full"
        />
      </div>

      {/* Main Layout Content */}
      <div
        className={cn(
          "flex flex-col md:flex-row w-full flex-1 overflow-hidden",
          "min-h-screen relative z-10"
        )}
      >
        <PulseSidebar />
        <div className="flex flex-1 flex-col">
          <Header
            title={title}
            description={description}
            onMenuClick={() => { }}
            isConnected={isConnected}
          />
          <div
            className="p-4 md:p-6 flex flex-col gap-4 flex-1 w-full h-full overflow-auto"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}