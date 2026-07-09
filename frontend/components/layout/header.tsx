'use client';

import { motion } from 'framer-motion';
import { Bell, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  title: string;
  description?: string;
  onMenuClick: () => void;
  isConnected: boolean;
}

export function Header({ title, description, onMenuClick, isConnected }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-6 py-4"
      style={{
        background: 'rgba(15, 15, 15, 0.7)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid rgba(212, 192, 142, 0.1)'
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden hover:bg-white/5"
          >
            <Menu className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </Button>

          {/* Title section */}
          <div>
            <h1 className="text-lg font-semibold text-white">
              {title}
            </h1>
            {description && (
              <p className="text-sm hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="hidden sm:block">
            <Badge
              variant="outline"
              className={`
                px-3 py-1.5 font-medium text-xs
                ${isConnected
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                }
              `}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {isConnected ? 'Connected' : 'Offline'}
            </Badge>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-white/5 rounded-xl"
          >
            <Bell className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#D4C08E', boxShadow: '0 0 6px rgba(212, 192, 142, 0.6)' }} />
          </Button>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-white/10" />

          {/* Profile */}
          <div className="hidden sm:flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar className="w-9 h-9 border-2" style={{ borderColor: 'rgba(212, 192, 142, 0.3)' }}>
              <AvatarImage src="/avatar.png" alt="User" />
              <AvatarFallback
                className="text-black text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #D4C08E 0%, #B8A577 100%)' }}
              >
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-white">PULSE</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Road Analyst</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}