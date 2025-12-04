import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/toaster";
import { AnalysisFormProvider } from "@/contexts/AnalysisFormContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GEO Analyzer - AI 검색 엔진 인용 분석 도구",
  description: "Perplexity, ChatGPT, Gemini, Claude 4개 AI 검색 엔진에서 내 도메인이 어떻게 인용되는지 분석합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${inter.variable} ${notoSansKr.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AnalysisFormProvider>
          <Header />
          <main className="container mx-auto py-8 px-4 md:px-6">
            {children}
          </main>
          <Toaster />
        </AnalysisFormProvider>
      </body>
    </html>
  );
}
