import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gawaloop.com"),
  title: {
    default: "GAWA Loop | Free Food Near You",
    template: "%s | GAWA Loop",
  },
  description:
    "GAWA Loop helps restaurants, hotels, and stores share free food with nearby communities in real time.",
  keywords: [
    "free food",
    "free food near me",
    "restaurant food donation",
    "community food sharing",
    "leftover food pickup",
    "food waste reduction",
    "NYC free food",
    "GAWA Loop",
  ],
  openGraph: {
    title: "GAWA Loop | Free Food Near You",
    description:
      "Find free food from local businesses and claim it in real time.",
    url: "https://gawaloop.com",
    siteName: "GAWA Loop",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 1200,
        alt: "GAWA Loop",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GAWA Loop | Free Food Near You",
    description:
      "Find free food from local businesses and claim it in real time.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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