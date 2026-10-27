import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "VoxVision School OS · Proposed solution for Manan Vidya", template: "%s · VoxVision School OS" },
  description:
    "VoxVision School OS: the school technology platform VoxVision proposes for Manan Vidya Manrakhan Mahto School, Ranchi. Learning, teaching, admissions, administration, hostel and management in one connected system.",
  metadataBase: new URL("https://www.voxvision.site"),
  // A proposal for one school: keep it out of search engines.
  robots: { index: false, follow: false },
  authors: [{ name: "VoxVision" }],
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0f" };

const THEME_SCRIPT = `try{var t=localStorage.getItem("mv-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the viewer's saved theme before first paint (light, dark or follow the system). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
