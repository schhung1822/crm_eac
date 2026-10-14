/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    webpackBuildWorker: false,
  },
  typescript: {
    ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "1",
  },
  compiler: {
    // Giữ lại error và warn để lỗi trên server còn xuất hiện trong log production.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/events",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "statics.pancake.vn",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
