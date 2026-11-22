import "./globals.css";

export const metadata = {
  title: "Geek Archive — Build work that matters",
  description:
    "AI-Powered Prototype Archive & Multidisciplinary Pod Matchmaking Engine connecting unfinished prototypes and SMME/NGO challenges with youth pods.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF8F5] text-[#2C1A10] antialiased">
        {children}
      </body>
    </html>
  );
}
