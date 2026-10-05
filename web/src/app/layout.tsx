import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { AuthLinkHandler } from "@/components/auth-link-handler";
import "./globals.css";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"] });
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: "OMSUN E-Services",
  description: "All Digital Services Under One Roof — Omerga, Maharashtra",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoDevanagari.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthLinkHandler />
        {children}
      </body>
    </html>
  );
}
