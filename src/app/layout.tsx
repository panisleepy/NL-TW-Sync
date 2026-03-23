import type { Metadata } from "next";
import { Nunito, Noto_Sans_TC, ZCOOL_XiaoWei } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
});

const xiaoWei = ZCOOL_XiaoWei({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-xiaowei",
});

export const metadata: Metadata = {
  title: "Hami · TimeBridge NL–TW",
  description: "台荷生活同步站 — 雙時區預約網格與拍立得日記",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${nunito.variable} ${notoSansTc.variable} ${xiaoWei.variable} relative min-h-screen font-sans antialiased`}
      >
        {/* 固定底層：確保 mesh 不被內容區塊吃掉；圖檔放 public/images/bg-mesh.png → /images/bg-mesh.png */}
        <div className="tb-mesh-bg" aria-hidden />
        <div className="relative z-[1] min-h-screen">{children}</div>
      </body>
    </html>
  );
}
