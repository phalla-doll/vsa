import type {Metadata} from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Visual Storytelling Assistant',
  description: 'Paste a transcript, and instantly get AI-powered visual ideas, keywords, and scene direction for your content.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
