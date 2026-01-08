import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Liga Virtual',
  description: '',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-gray-100 antialiased">{children}</body>
    </html>
  );
}
