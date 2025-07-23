# Multi-stage build for Claude Code UI
# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ linux-headers

# Copy package files
COPY package*.json ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build the frontend
RUN npm run build

# Stage 2: Production runtime
FROM claudecode:latest AS production

# Switch to root for setup
USER root

# Install Node.js and dumb-init if not present (claudebox is based on Debian)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs dumb-init

# Install Claude CLI globally (same as claudebox)
RUN npm install -g @anthropic-ai/claude-code

# Create app directory and user (if not exists)
RUN id -u claudeui >/dev/null 2>&1 || useradd -m -s /bin/bash -u 1001 claudeui


WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy server code
COPY server/ ./server/

# Copy scripts
COPY scripts/ ./scripts/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Create necessary directories and set permissions
RUN mkdir -p /app/data && \
    mkdir -p /home/claudeui/.claude/projects && \
    mkdir -p /home/claudeui/Documents && \
    chown -R claudeui:claudeui /app && \
    chown -R claudeui:claudeui /home/claudeui
# Set environment variables for claudebox compatibility
ENV CLAUDEBOX_PROJECT_NAME=claude-code-ui
ENV DEVCONTAINER=true

# Switch to non-root user
USER claudeui

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3008/api/config', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Override the claudebox entrypoint with our own
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

# Use dumb-init to handle signals properly and start the application
CMD ["dumb-init", "node", "server/index.js"]
