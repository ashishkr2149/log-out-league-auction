import type { Metadata } from 'next';
import { Space_Grotesk, Outfit } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Log Out League - Auction Platform',
  description: 'Cricket auction management and live broadcast graphics platform for the Log Out League tournament.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
