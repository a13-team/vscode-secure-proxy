# Local SOCKS5 Proxy Server for SSH Connections

A high-performance, secure SOCKS5 proxy server optimized for VSCode remote SSH development on Windows 11. Features include authentication, encryption, detailed logging, and performance optimizations.

## Features

- 🔒 Secure SOCKS5 proxy with authentication
- ⚡ High-performance connection handling
- 📝 Detailed logging for troubleshooting
- 🛡️ Security hardening measures
- 🔧 Easy configuration
- 🔌 VSCode integration support
- 💻 Windows 11 optimized

## Installation

1. Clone the repository:
```bash
git clone https://github.com/a13.team/vscode-secure-proxy.git
cd vscode-secure-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
# Create .env file
PROXY_USERNAME=your_username
PROXY_PASSWORD=your_secure_password
ENCRYPTION_KEY=your-secure-key-min-32-chars-long
LOG_LEVEL=info
```

## Usage

1. Start the proxy server:
```bash
npm start
```

2. Configure VSCode:

   a. Open VSCode settings (Ctrl+,)
   
   b. Search for "Remote SSH"
   
   c. Add these settings:
   ```json
   {
     "remote.SSH.proxyCommand": "connect -S 127.0.0.1:1080 %h %p",
     "remote.SSH.useLocalServer": true
   }
   ```

3. Configure SSH config (`~/.ssh/config`):
```
Host *
    ProxyCommand connect -S 127.0.0.1:1080 %h %p
```

## Configuration

The server can be configured through environment variables or by modifying `src/config.js`:

- `PROXY_USERNAME`: Authentication username (default: admin)
- `PROXY_PASSWORD`: Authentication password (default: changeme)
- `ENCRYPTION_KEY`: Encryption key for secure connections
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Security Best Practices

1. **Authentication**:
   - Always change default credentials
   - Use strong passwords
   - Enable authentication in production

2. **Network Security**:
   - Limit proxy access to localhost
   - Use firewall rules to restrict access
   - Monitor connection logs

3. **Maintenance**:
   - Keep dependencies updated
   - Monitor server logs
   - Regularly audit security settings

## Performance Optimization

The proxy server includes several performance optimizations:

- TCP Keep-Alive for connection stability
- Connection pooling
- Optimized buffer sizes
- Efficient memory management

## Logging

Logs are stored in the `logs` directory:

- `combined.log`: All log levels
- `error.log`: Error-level logs only

Log format includes:
- Timestamp
- Log level
- Request ID
- Message
- Additional metadata

## Troubleshooting

1. Connection Issues:
   - Check proxy server is running
   - Verify authentication credentials
   - Check firewall settings
   - Review error logs

2. Performance Issues:
   - Monitor system resources
   - Check connection limits
   - Review performance settings
   - Analyze log patterns

## Development

1. Start in development mode:
```bash
npm run dev
```

2. Run tests:
```bash
npm test
```

## License

MIT License - feel free to use and modify for your needs.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request