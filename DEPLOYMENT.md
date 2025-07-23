# Deployment Guide

This guide covers deployment options for Claude Code UI across different environments and platforms.

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [Docker](https://www.docker.com/) and Docker Compose
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and configured
- Git for version control

## 🚀 Quick Start

### Local Development
```bash
# Clone and setup
git clone <repository-url>
cd claude-code-ui
npm install

# Start development server
npm run dev
```

### Docker Development
```bash
# Build and run with Docker
npm run docker:build
npm run docker:run

# View logs
npm run docker:logs

# Stop containers
npm run docker:stop
```

## 🏗️ Build Process

### Web Application
```bash
# Build frontend
npm run build

# Build with environment configuration
npm run config:prod
npm run build
```

### Mobile Applications
```bash
# Configure for production
npm run config:prod

# Build mobile apps
npm run build:mobile
npm run build:android
npm run build:ios
```

### Docker Image
```bash
# Build Docker image
docker build -t claude-code-ui .

# Or use npm script
npm run docker:build
```

## 🌍 Environment Configuration

### Development
```bash
npm run config:dev
npm run deploy:dev
```

### Testing
```bash
npm run config:test
npm run deploy:test
```

### Production
```bash
npm run config:prod
npm run deploy:prod
```

## 📦 Release Management

### Version Bumping
```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release:patch

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major

# Dry run (preview changes)
npm run release:dry
```

### Manual Release Process
```bash
# 1. Ensure clean working directory
git status

# 2. Run tests
npm test
npm run test:coverage

# 3. Verify PWA functionality
npm run verify:pwa

# 4. Create release
npm run release:minor

# 5. Push to trigger CI/CD
git push origin main --tags
```

## 🐳 Docker Deployment

### Development Environment
```bash
# Start development stack
docker-compose up -d

# View logs
docker-compose logs -f claude-code-ui

# Stop stack
docker-compose down
```

### Production Environment
```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# With monitoring
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Health check
curl http://localhost:3008/api/config
```

### Environment Variables
```bash
# Required for production
export API_BASE_URL=https://api.claudecode.app
export WS_BASE_URL=wss://api.claudecode.app

# Optional
export NODE_ENV=production
export PORT=3008
```

## ☁️ Cloud Deployment

### Docker Hub
```bash
# Tag and push
docker tag claude-code-ui:latest your-username/claude-code-ui:latest
docker push your-username/claude-code-ui:latest
```

### GitHub Container Registry
```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag and push
docker tag claude-code-ui:latest ghcr.io/username/claude-code-ui:latest
docker push ghcr.io/username/claude-code-ui:latest
```

### Kubernetes
```yaml
# Example deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-code-ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app: claude-code-ui
  template:
    metadata:
      labels:
        app: claude-code-ui
    spec:
      containers:
      - name: claude-code-ui
        image: claude-code-ui:latest
        ports:
        - containerPort: 3008
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3008"
```

## 📱 Mobile App Deployment

### Android (Google Play)
```bash
# Build release APK
npm run build:android

# Generate signed APK
cd android
./gradlew assembleRelease

# Upload to Google Play Console
# File: android/app/build/outputs/apk/release/app-release.apk
```

### iOS (App Store)
```bash
# Build for iOS
npm run build:ios

# Open in Xcode
npm run open:ios

# Archive and upload via Xcode
# Or use Xcode Cloud for automated builds
```

## 🔧 Deployment Scripts

### Available Scripts
```bash
# Deployment
npm run deploy:dev      # Deploy to development
npm run deploy:test     # Deploy to testing
npm run deploy:prod     # Deploy to production
npm run deploy:mobile   # Build mobile apps
npm run deploy:status   # Show deployment status

# Docker
npm run docker:build    # Build Docker image
npm run docker:run      # Start containers
npm run docker:stop     # Stop containers
npm run docker:logs     # View logs

# Release
npm run release:patch   # Patch release
npm run release:minor   # Minor release
npm run release:major   # Major release
npm run release:dry     # Dry run release
```

## 🔍 Monitoring & Health Checks

### Health Check Endpoint
```bash
# Check application health
curl http://localhost:3008/api/config

# Expected response
{
  "serverPort": 3008,
  "wsUrl": "ws://localhost:3008"
}
```

### Container Health
```bash
# Check container status
docker ps

# View container logs
docker logs claude-code-ui

# Execute commands in container
docker exec -it claude-code-ui sh
```

### PWA Verification
```bash
# Verify PWA functionality
npm run verify:pwa

# Check service worker
curl http://localhost:3008/sw.js

# Check manifest
curl http://localhost:3008/manifest.json
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3008

# Kill process
kill -9 <PID>
```

#### Docker Build Fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t claude-code-ui .
```

#### Mobile Build Issues
```bash
# Clean Capacitor
npx cap clean android
npx cap clean ios

# Sync again
npm run sync
```

#### Database Issues
```bash
# Reset database
rm -rf server/database/*.db

# Restart application
npm restart
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## 🔐 Security Considerations

### Production Checklist
- [ ] Use HTTPS in production
- [ ] Set secure environment variables
- [ ] Enable authentication if required
- [ ] Configure proper CORS settings
- [ ] Use non-root user in containers
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities

### Environment Variables
```bash
# Never commit these to version control
API_KEY=your-secret-api-key
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
```

## 📞 Support

For deployment issues:
1. Check the logs: `npm run docker:logs`
2. Verify configuration: `npm run deploy:status`
3. Run health checks: `curl http://localhost:3008/api/config`
4. Check GitHub Issues for known problems
