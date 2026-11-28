import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata = {
  title: "Geek Archive — Build work that matters",
  description:
    "AI-Powered Prototype Archive & Multidisciplinary Pod Matchmaking Engine connecting unfinished prototypes and SMME/NGO challenges with youth pods.",
  icons: {
    icon: "/geek-archive-logo.png",
    apple: "/geek-archive-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    // Browser extensions (QuillBot, Grammarly, …) add attributes to <html>/<body> before React
    // loads; this ignores only those two tags' own attributes, not mismatches inside the page.
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <body
        className={`${sans.className} min-h-screen bg-[#FAF8F5] text-[#2C1A10] antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
