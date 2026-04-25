// src/config/env.ts
const ENV = {
  dev: {
    API_URL: 'http://localhost:3000',
    WS_URL: 'ws://localhost:3000',
  },
  prod: {
    API_URL: 'https://chefchina-admin.vercel.app',
    WS_URL: 'wss://chefchina-admin.vercel.app',
  },
};

// 根据环境自动切换
const isDev = __DEV__; // Expo/React Native 内置变量
export const config = isDev ? ENV.dev : ENV.prod;

export default config;
