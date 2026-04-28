import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/ThemeSync";

const notoJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "診療ガイドライン × GRADE 学習アプリ",
  description:
    "AI-EBM先生と一緒に学ぶ、診療ガイドラインとGRADEアプローチのインタラクティブ学習Webアプリ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

const preHydrationScript = `(()=>{try{const s=localStorage.getItem('gradeslide-ui');if(!s)return;const t=JSON.parse(s)?.state?.theme;if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${notoJP.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preHydrationScript }} />
      </head>
      <body className="min-h-svh flex flex-col">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
