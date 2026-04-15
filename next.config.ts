import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply CORS headers to all /api/v1 routes
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization,Content-Type" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        // Redirect bare domain API calls to www — preserves method and body
        source: "/api/:path*",
        has: [{ type: "host", value: "gawaloop.com" }],
        destination: "https://www.gawaloop.com/api/:path*",
        permanent: false, // 307 — preserves POST method and Authorization header
      },
    ];
  },
};

export default nextConfig;
