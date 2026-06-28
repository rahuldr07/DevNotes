import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { SoundProvider } from "@/components/SoundProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GoeyToaster } from "@/components/ui/goey-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  weight: ["400", "500"],
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
    // suppressHydrationWarning: ThemeProvider sets data-theme + .dark class
    // on the client, which would cause a hydration mismatch warning without this.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${gellix.variable} ${robotoMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <SoundProvider>
            <TooltipProvider>
              <OnboardingDialog />
              {children}
              <GoeyToaster />
            </TooltipProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
