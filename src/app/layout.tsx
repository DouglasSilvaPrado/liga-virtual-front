import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liga Virtual",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body className="antialiased bg-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
