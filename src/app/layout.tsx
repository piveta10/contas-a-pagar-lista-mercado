import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DialogosGlobais } from "@/components/ui/dialogos";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const fonte = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Controle de Contas", template: "%s · Controle de Contas" },
  description: "Contas da casa e lista de compras, em um só lugar.",
  applicationName: "Controle de Contas",
  appleWebApp: { capable: true, title: "Contas", statusBarStyle: "default" },
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#14114d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster />
        <DialogosGlobais />
      </body>
    </html>
  );
}
