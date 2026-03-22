import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Free Food Listings",
  description:
    "Browse live free food listings from local restaurants and businesses near you.",
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}