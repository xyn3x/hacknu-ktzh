/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxy /api/* → API Gateway so the frontend never hard-codes a host.
  // In Docker the gateway is at http://api-gateway:8080.
  // For local dev set NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080.
  async rewrites() {
    const gatewayUrl =
      process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://api-gateway:8080"
    return [
      {
        source: "/api/:path*",
        destination: `${gatewayUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
