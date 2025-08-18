/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Suppress critical dependency warnings for node-gyp-build
    config.module.rules.push({
      test: /node_modules\/node-gyp-build\/index\.js$/,
      use: {
        loader: 'string-replace-loader',
        options: {
          search: 'require.addon',
          replace: 'false && require.addon',
          flags: 'g'
        }
      }
    });

    return config;
  },
};

export default nextConfig;
