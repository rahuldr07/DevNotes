import type { Metadata } from "next";
import { JetBrains_Mono, Lora, Roboto_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { SoundProvider } from "@/components/SoundProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeStudio } from "@/components/ThemeStudio";
import { GoeyToaster } from "@/components/ui/goey-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { buildThemeCss, buildThemeInitScript } from "@/lib/themes";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  weight: ["400", "500"],
  display: "swap",
});

// Theme style axes: terminal colorways set their UI face to JetBrains Mono,
// editorial ones to Lora — see the font stacks in src/lib/themes.ts.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const gellix = localFont({
  src: [
    {
      path: "../../public/fonts/gellix/Gellix-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/gellix/Gellix-RegularItalic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/gellix/Gellix-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/gellix/Gellix-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/gellix/Gellix-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/gellix/Gellix-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gellix",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevNotes",
  description: "A developer note-taking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline init script below sets data-theme
    // + .dark class before hydration, which would otherwise warn.
    // Font variables live on <html> so the [data-theme] blocks (also on
    // <html>) can resolve them into each theme's --ui-font-sans stack.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${gellix.variable} ${robotoMono.variable} ${jetbrainsMono.variable} ${lora.variable}`}
    >
      <body className="font-sans antialiased">
        {/* Theme variable blocks, generated from src/lib/themes.ts. */}
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time generated CSS from our own registry
          dangerouslySetInnerHTML={{ __html: buildThemeCss() }}
        />
        {/* Blocking script: applies the saved theme before first paint. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time generated script from our own registry
          dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }}
        />
        <ThemeProvider>
          <SoundProvider>
            <TooltipProvider>
              <OnboardingDialog />
              {children}
              <ThemeStudio />
              <GoeyToaster />
            </TooltipProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
