/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um servidor enxuto em .next/standalone (usado pelo Dockerfile)
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
