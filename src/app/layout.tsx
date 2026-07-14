import type { Metadata } from "next";
import "./globals.css";

const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || "CHRONOS";
const description =
  "Sistema de gestão de cronograma e timeline. Gantt + Kanban + Notificações Telegram em um só lugar.";

export const metadata: Metadata = {
  title: {
    default: `${productName} — Gestão de Cronograma`,
    template: `%s | ${productName}`,
  },
  description,
  keywords: [
    "cronograma",
    "timeline",
    "gantt",
    "kanban",
    "project management",
    "schedule",
    "Telegram",
  ],
  authors: [{ name: "Esly & Sarah" }],
  openGraph: {
    title: productName,
    description,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
