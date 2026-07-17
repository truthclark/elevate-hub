/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    // Photo uploads (form covers, deal photos) come through server actions;
    // the default 1MB cap rejects normal phone photos with a server error.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
