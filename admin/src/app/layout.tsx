import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
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
      <body className={`${robotoMono.variable} font-sans antialiased`}>
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
