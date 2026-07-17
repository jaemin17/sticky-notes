import type { Metadata } from "next";
import { Geist, Geist_Mono, Kalam, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["400"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "我的便签网站",
  description: "一个使用 Next.js 和 GitHub Pages 发布的便签网站练习项目。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${kalam.variable} ${outfit.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
