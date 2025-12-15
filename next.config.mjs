/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    instrumentationHook: true,
  },
  productionBrowserSourceMaps: true,
  webpack: (config, { isServer }) => {
    // Generate source maps for both client and server
    if (!isServer) {
      config.devtool = 'source-map'
    }
    return config
  },
}

export default nextConfig
