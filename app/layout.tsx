import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "הערכת שכר דירה",
  description: "הערכת שווי שכירות הוגנת לדירות בישראל",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html dir="rtl" lang="he">
      <body className="antialiased">{children}</body>
    </html>
  );
}
