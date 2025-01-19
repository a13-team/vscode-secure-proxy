import { config } from '../config.js';
import { createRequestLogger } from '../utils/logger.js';
import crypto from 'crypto';

export class Authenticator {
  constructor() {
    this.logger = createRequestLogger('authenticator');
    this.enabled = config.security.authentication.enabled;
  }

  /**
   * Verify SOCKS5 authentication credentials
   * @param {Buffer} username - Username from client
   * @param {Buffer} password - Password from client
   * @returns {Promise<boolean>} Authentication result
   */
  async verifyCredentials(username, password) {
    if (!this.enabled) {
      this.logger.debug('Authentication disabled, allowing connection');
      return true;
    }

    const providedUsername = username.toString();
    const providedPassword = password.toString();

    // Use timing-safe comparison to prevent timing attacks
    const usernameMatch = crypto.timingSafeEqual(
      Buffer.from(providedUsername),
      Buffer.from(config.security.authentication.username)
    );
    
    const passwordMatch = crypto.timingSafeEqual(
      Buffer.from(providedPassword),
      Buffer.from(config.security.authentication.password)
    );

    const isAuthenticated = usernameMatch && passwordMatch;

    if (!isAuthenticated) {
      this.logger.warn('Authentication failed', {
        username: providedUsername,
        remoteAddress: this.getClientIP()
      });
    } else {
      this.logger.info('Authentication successful', {
        username: providedUsername,
        remoteAddress: this.getClientIP()
      });
    }

    return isAuthenticated;
  }

  /**
   * Get client IP address from socket
   * @private
   * @returns {string} Client IP address
   */
  getClientIP() {
    try {
      return this.socket?.remoteAddress || 'unknown';
    } catch (error) {
      this.logger.error('Error getting client IP', { error });
      return 'unknown';
    }
  }

  /**
   * Set socket for current authentication attempt
   * @param {net.Socket} socket - Client socket
   */
  setSocket(socket) {
    this.socket = socket;
  }

  /**
   * Generate authentication methods based on configuration
   * @returns {Buffer} SOCKS5 authentication methods
   */
  getAuthenticationMethods() {
    // 0x00: No authentication
    // 0x02: Username/password authentication
    return Buffer.from([this.enabled ? 0x02 : 0x00]);
  }
}

export const authenticator = new Authenticator();