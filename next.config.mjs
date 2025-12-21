/** @type {import("next").NextConfig} */
const nextConfig = {
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
