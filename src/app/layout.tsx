import "./globals.css";

export const metadata = {
  title: "Distributed Ecommerce",
  description: "Distributed Ecommerce System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}