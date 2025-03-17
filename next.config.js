/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    SONIC_RPC_URL: process.env.SONIC_RPC_URL,
    SONIC_TESTNET_RPC_URL: process.env.SONIC_TESTNET_RPC_URL,
  },
  // Ensure environment variables are available at build time
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV,
  },
  // Ensure environment variables are available at runtime
  serverRuntimeConfig: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
  },
};

module.exports = nextConfig;
