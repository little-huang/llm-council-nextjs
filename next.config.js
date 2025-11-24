/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允许较大的响应体
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // 启用 standalone 输出以便 Docker 部署
  output: 'standalone',
}

module.exports = nextConfig


