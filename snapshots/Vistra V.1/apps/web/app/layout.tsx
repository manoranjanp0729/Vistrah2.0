import type React from "react";
import "./globals.css";
import ConditionalHeader from "./components/ConditionalHeader";
import ConditionalFooter from "./components/ConditionalFooter";

export const metadata = {
  title: "VISTRAH",
  description: "Connecting Marketplace — services, opportunities and work on one platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConditionalHeader />
        {children}
        <ConditionalFooter />
      </body>
    </html>
  );
}
