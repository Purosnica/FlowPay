/** @type {import("next").NextConfig} */
const nextConfig = {
  // Evita que Turbopack intente empaquetar APIs de Node de Sentry.
  serverExternalPackages: ['@sentry/node', '@sentry/node-core'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // I107: CDN opcional (p. ej. https://cdn.example.com). Vacío = origen / Vercel edge.
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  // CDN / edge cache de assets estáticos (Vercel CDN + browsers).
  // Verificado: /_next/static hashed + Cache-Control immutable; /images y /fonts con SWR.
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: ""
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: ""
      },
      // Dominio R2 comentado - descomentar solo si es necesario
      // {
      //   protocol: "https",
      //   hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
      //   port: ""
      // }
    ],
    // Configurar calidades permitidas para imágenes
    // Permite usar quality={75} y quality={90}
    qualities: [75, 90],
  }
};

export default nextConfig;
