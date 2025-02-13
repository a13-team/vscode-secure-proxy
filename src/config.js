export const config = {
  server: {
    port: 1080,
    host: '0.0.0.0', // Changed from '127.0.0.1' to allow external connections
    backlog: 511,
    keepAlive: true,
    keepAliveInitialDelay: 0
  },
  security: {
    authentication: {
      enabled: false,
      username: process.env.PROXY_USERNAME || '',
      password: process.env.PROXY_PASSWORD || ''
    },
    encryption: {
      enabled: true,
      method: 'aes-256-gcm',
      key: process.env.ENCRYPTION_KEY || 'tH8l4a0Swr8VcXxM42OvojZLwfniSgspjIQ6x2N3acE='
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    directory: './logs'
  },
  performance: {
    tcpNoDelay: true,
    maxConnections: 10000,
    timeout: 60000,
    bufferSize: 32 * 1024 // 32KB
  }
};