#!/bin/bash

# Docker entrypoint script for Claude Code UI
# Handles path mapping and initialization for containerized environment

set -e

echo "🚀 Starting Claude Code UI in container..."

# Set up environment
export HOME=/home/claudeui
export CLAUDE_HOME=/home/claudeui/.claude

# Create necessary directories
mkdir -p "$HOME/.claude/projects"
mkdir -p "$HOME/Documents"
mkdir -p "/app/data"

# Set proper permissions
chown -R claudeui:claudeui "$HOME" || true
chown -R claudeui:claudeui "/app/data" || true

# Setup Claude CLI configuration for custom API endpoints
echo "🔧 Setting up Claude CLI configuration..."
if [ -n "$ANTHROPIC_API_KEY" ] && [ -n "$ANTHROPIC_BASE_URL" ]; then
    echo "📝 Creating Claude CLI config with custom endpoint..."
    
    # Create Claude config directory
    mkdir -p "$HOME/.claude"
    
    # Create Claude CLI configuration file
    cat > "$HOME/.claude.json" << EOF
{
  "apiKey": "$ANTHROPIC_API_KEY",
  "baseUrl": "$ANTHROPIC_BASE_URL"
}
EOF
    
    echo "✅ Claude CLI config created:"
    echo "   API Key: set (****)"
    echo "   Base URL: $ANTHROPIC_BASE_URL"
    
    # Also set environment variables for Claude CLI
    export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    export ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL"
    export CLAUDE_API_KEY="$ANTHROPIC_API_KEY"
    
elif [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "📝 Creating Claude CLI config with default endpoint..."
    
    # Create Claude config directory
    mkdir -p "$HOME/.claude"
    
    # Create Claude CLI configuration file
    cat > "$HOME/.claude.json" << EOF
{
  "apiKey": "$ANTHROPIC_API_KEY"
}
EOF
    
    echo "✅ Claude CLI config created with default endpoint"
    
    # Set environment variables
    export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    export CLAUDE_API_KEY="$ANTHROPIC_API_KEY"
    
else
    echo "⚠️  No ANTHROPIC_API_KEY found, Claude CLI may not work properly"
fi

# Check if Claude CLI is available
if command -v claude >/dev/null 2>&1; then
    echo "✅ Claude CLI is available"
    claude --version || echo "⚠️  Claude CLI version check failed"
else
    echo "❌ Claude CLI not found in PATH"
    echo "PATH: $PATH"
    which node || echo "Node.js not found"
    npm list -g @anthropic-ai/claude-code 2>/dev/null || echo "Claude CLI package not installed globally"
fi

# Check mounted volumes
echo "📁 Checking mounted volumes..."
if [ -d "/home/claudeui/Documents" ]; then
    echo "✅ Documents directory mounted"
    ls -la /home/claudeui/Documents | head -5 || echo "Empty or inaccessible"
else
    echo "⚠️  Documents directory not mounted"
fi

if [ -d "/home/claudeui/.claude" ]; then
    echo "✅ Claude directory mounted"
    ls -la /home/claudeui/.claude | head -5 || echo "Empty or inaccessible"
else
    echo "⚠️  Claude directory not mounted"
fi

# Print helpful information
echo ""
echo "🔧 Container Configuration:"
echo "   Home: $HOME"
echo "   Claude Home: $CLAUDE_HOME"
echo "   Working Dir: $(pwd)"
echo "   User: $(whoami)"
echo "   UID: $(id -u)"
echo "   GID: $(id -g)"
echo "   API Key: ${ANTHROPIC_API_KEY:+set (****)}"
echo "   Base URL: ${ANTHROPIC_BASE_URL:-default}"
echo ""

echo "💡 To use projects in the container:"
echo "   1. Place projects in ~/Documents on your host machine"
echo "   2. In the UI, use paths like: /home/claudeui/Documents/your-project"
echo "   3. Or use the workspace: /workspace (current directory)"
echo ""

# Switch to claudeui user and start the application
echo "🎯 Starting Claude Code UI server..."
exec "$@"
