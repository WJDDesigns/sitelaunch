/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Silence the "Detected multiple lockfiles" warning if it shows up.
  // Vercel only ships the lockfile at the project root.
};

export default nextConfig;
