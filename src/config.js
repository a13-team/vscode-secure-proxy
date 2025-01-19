export const config = {
  server: {
    port: 1080,
    host: '127.0.0.1',
    backlog: 511,
    keepAlive: true,
    keepAliveInitialDelay: 0
  },
  security: {
    authentication: {
      enabled: true,
      username: process.env.PROXY_USERNAME || 'admin',
      password: process.env.PROXY_PASSWORD || 'changeme'
    },
    encryption: {
      enabled: true,
      method: 'aes-256-gcm',
      key: process.env.ENCRYPTION_KEY || 'your-secure-key-min-32-chars-long!!'
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