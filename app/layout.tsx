import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RUDA Execution OS",
  description: "ARD Pvt Ltd · War Room Sprint Task Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
