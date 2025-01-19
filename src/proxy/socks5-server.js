import net from 'net';
import { createRequestLogger } from '../utils/logger.js';
import { config } from '../config.js';
import { authenticator } from '../auth/authenticator.js';
import crypto from 'crypto';

const SOCKS_VERSION = 0x05;
const AUTHENTICATION_VERSION = 0x01;

// SOCKS5 command types
const COMMANDS = {
  CONNECT: 0x01,
  BIND: 0x02,
  UDP_ASSOCIATE: 0x03
};

// SOCKS5 address types
const ADDRESS_TYPES = {
  IPv4: 0x01,
  DOMAIN: 0x03,
  IPv6: 0x04
};

// SOCKS5 response codes
const RESPONSES = {
  SUCCESS: 0x00,
  SERVER_FAILURE: 0x01,
  CONNECTION_NOT_ALLOWED: 0x02,
  NETWORK_UNREACHABLE: 0x03,
  HOST_UNREACHABLE: 0x04,
  CONNECTION_REFUSED: 0x05,
  TTL_EXPIRED: 0x06,
  COMMAND_NOT_SUPPORTED: 0x07,
  ADDRESS_TYPE_NOT_SUPPORTED: 0x08
};

export class Socks5Server {
  constructor() {
    this.logger = createRequestLogger('socks5-server');
    this.server = net.createServer(this.handleConnection.bind(this));
    this.connections = new Set();
    this.setupServerOptions();
  }

  setupServerOptions() {
    const { performance } = config;
    this.server.maxConnections = performance.maxConnections;
    this.server.on('error', this.handleServerError.bind(this));
  }

  async start() {
    const { port, host } = config.server;
    return new Promise((resolve, reject) => {
      this.server.listen(port, host, () => {
        this.logger.info(`SOCKS5 proxy server listening on ${host}:${port}`);
        resolve();
      }).on('error', reject);
    });
  }

  async handleConnection(clientSocket) {
    const requestId = crypto.randomBytes(16).toString('hex');
    const logger = createRequestLogger(requestId);
    
    this.connections.add(clientSocket);
    this.optimizeSocket(clientSocket);

    clientSocket.on('error', (err) => {
      logger.error('Client socket error', { error: err.message });
      clientSocket.destroy();
    });

    clientSocket.on('close', () => {
      this.connections.delete(clientSocket);
      logger.debug('Client disconnected');
    });

    try {
      await this.handleInitialGreeting(clientSocket, logger);
      await this.handleAuthentication(clientSocket, logger);
      await this.handleRequest(clientSocket, logger);
    } catch (error) {
      logger.error('Connection handling error', { error: error.message });
      clientSocket.destroy();
    }
  }

  optimizeSocket(socket) {
    const { performance } = config;
    socket.setNoDelay(performance.tcpNoDelay);
    socket.setTimeout(performance.timeout);
    socket.setKeepAlive(config.server.keepAlive, config.server.keepAliveInitialDelay);
  }

  async handleInitialGreeting(socket, logger) {
    const data = await this.readFromSocket(socket, 2);
    const version = data[0];
    const methodsCount = data[1];

    if (version !== SOCKS_VERSION) {
      logger.warn('Unsupported SOCKS version', { version });
      socket.end(Buffer.from([0x05, 0xFF]));
      throw new Error('Unsupported SOCKS version');
    }

    const methods = await this.readFromSocket(socket, methodsCount);
    const authMethods = authenticator.getAuthenticationMethods();
    socket.write(Buffer.from([SOCKS_VERSION, authMethods[0]]));
  }

  async handleAuthentication(socket, logger) {
    if (!config.security.authentication.enabled) {
      return true;
    }

    const authHeader = await this.readFromSocket(socket, 2);
    if (authHeader[0] !== AUTHENTICATION_VERSION) {
      throw new Error('Unsupported authentication version');
    }

    const usernameLength = authHeader[1];
    const username = await this.readFromSocket(socket, usernameLength);
    
    const passwordLengthBuf = await this.readFromSocket(socket, 1);
    const passwordLength = passwordLengthBuf[0];
    const password = await this.readFromSocket(socket, passwordLength);

    authenticator.setSocket(socket);
    const authenticated = await authenticator.verifyCredentials(username, password);

    const response = Buffer.from([AUTHENTICATION_VERSION, authenticated ? 0x00 : 0x01]);
    socket.write(response);

    if (!authenticated) {
      throw new Error('Authentication failed');
    }
  }

  async handleRequest(socket, logger) {
    const header = await this.readFromSocket(socket, 4);
    const version = header[0];
    const command = header[1];
    const addressType = header[3];

    if (version !== SOCKS_VERSION) {
      throw new Error('Invalid SOCKS version in request');
    }

    let targetHost, targetPort;
    switch (addressType) {
      case ADDRESS_TYPES.IPv4:
        const ipv4 = await this.readFromSocket(socket, 4);
        targetHost = ipv4.join('.');
        break;
      case ADDRESS_TYPES.DOMAIN:
        const domainLength = (await this.readFromSocket(socket, 1))[0];
        const domain = await this.readFromSocket(socket, domainLength);
        targetHost = domain.toString();
        break;
      case ADDRESS_TYPES.IPv6:
        const ipv6 = await this.readFromSocket(socket, 16);
        targetHost = ipv6.toString('hex').match(/.{1,4}/g).join(':');
        break;
      default:
        throw new Error('Unsupported address type');
    }

    const portBuf = await this.readFromSocket(socket, 2);
    targetPort = portBuf.readUInt16BE(0);

    switch (command) {
      case COMMANDS.CONNECT:
        await this.handleConnect(socket, targetHost, targetPort, logger);
        break;
      default:
        logger.warn('Unsupported command', { command });
        this.sendResponse(socket, RESPONSES.COMMAND_NOT_SUPPORTED);
        throw new Error('Unsupported command');
    }
  }

  async handleConnect(clientSocket, targetHost, targetPort, logger) {
    logger.info('Connecting to target', { host: targetHost, port: targetPort });

    const targetSocket = new net.Socket();
    this.optimizeSocket(targetSocket);

    try {
      await new Promise((resolve, reject) => {
        targetSocket.connect(targetPort, targetHost, resolve);
        targetSocket.on('error', reject);
      });

      const boundAddress = targetSocket.localAddress;
      const boundPort = targetSocket.localPort;
      this.sendResponse(clientSocket, RESPONSES.SUCCESS, boundAddress, boundPort);

      this.setupPipe(clientSocket, targetSocket, logger);
    } catch (error) {
      logger.error('Connection failed', { error: error.message });
      this.sendResponse(clientSocket, RESPONSES.HOST_UNREACHABLE);
      throw error;
    }
  }

  setupPipe(clientSocket, targetSocket, logger) {
    clientSocket.pipe(targetSocket).pipe(clientSocket);

    targetSocket.on('error', (err) => {
      logger.error('Target socket error', { error: err.message });
      clientSocket.destroy();
    });

    targetSocket.on('close', () => {
      logger.debug('Target connection closed');
      clientSocket.destroy();
    });
  }

  sendResponse(socket, status, boundAddr = '0.0.0.0', boundPort = 0) {
    const response = Buffer.alloc(10);
    response[0] = SOCKS_VERSION;
    response[1] = status;
    response[2] = 0x00; // Reserved
    response[3] = 0x01; // IPv4
    boundAddr.split('.').forEach((octet, i) => {
      response[4 + i] = parseInt(octet);
    });
    response.writeUInt16BE(boundPort, 8);
    socket.write(response);
  }

  readFromSocket(socket, length) {
    return new Promise((resolve, reject) => {
      socket.once('data', (data) => {
        if (data.length < length) {
          reject(new Error('Insufficient data received'));
        } else {
          resolve(data.slice(0, length));
        }
      });
    });
  }

  handleServerError(error) {
    this.logger.error('Server error', { error: error.message });
    this.shutdown();
  }

  async shutdown() {
    this.logger.info('Shutting down SOCKS5 proxy server');
    
    // Close all active connections
    for (const socket of this.connections) {
      socket.destroy();
    }
    this.connections.clear();

    // Close server
    if (this.server.listening) {
      await new Promise((resolve) => this.server.close(resolve));
    }
  }
}

export const createServer = () => new Socks5Server();