import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { PulseProvider } from '@/components/pulse-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PULSE Dashboard',
  description: 'AI-powered road surface monitoring and pavement condition analysis',
  keywords: ['road monitoring', 'IRI', 'pavement condition', 'smart infrastructure', 'real-time dashboard'],
  authors: [{ name: 'PULSE Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen font-inter" style={{ background: 'var(--dashboard-bg)' }}>
        <AuthProvider>
          <PulseProvider>
            <div id="root">
              {children}
            </div>
          </PulseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}