#!/bin/bash

# Test script to verify Claude CLI configuration
# This script tests if Claude CLI can connect to the configured API endpoint

set -e

echo "🧪 Testing Claude CLI Configuration"
echo "=================================="

# Load environment variables
if [ -f ".env" ]; then
    echo "📄 Loading environment from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  No .env file found"
fi

# Display current configuration
echo ""
echo "🔧 Current Configuration:"
echo "   ANTHROPIC_BASE_URL: ${ANTHROPIC_BASE_URL:-not set}"
echo "   ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+set (****)}"
echo ""

# Test API connection using curl
if [ -n "$ANTHROPIC_API_KEY" ] && [ -n "$ANTHROPIC_BASE_URL" ]; then
    echo "🌐 Testing API connection to $ANTHROPIC_BASE_URL..."
    
    # Test with curl
    response=$(curl -s -w "%{http_code}" -o /tmp/api_test.json \
        -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
        -H "Content-Type: application/json" \
        "$ANTHROPIC_BASE_URL/v1/models" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo "✅ API connection successful!"
        echo "📋 Available models:"
        cat /tmp/api_test.json | jq -r '.data[].id' 2>/dev/null || cat /tmp/api_test.json
    else
        echo "❌ API connection failed (HTTP $response)"
        echo "📋 Response:"
        cat /tmp/api_test.json 2>/dev/null || echo "No response body"
    fi
    
    rm -f /tmp/api_test.json
    
elif [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "🌐 Testing API connection to default endpoint..."
    
    # Test with default endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/api_test.json \
        -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
        -H "Content-Type: application/json" \
        "https://api.anthropic.com/v1/models" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo "✅ API connection successful!"
    else
        echo "❌ API connection failed (HTTP $response)"
    fi
    
    rm -f /tmp/api_test.json
    
else
    echo "❌ No API key configured"
fi

echo ""
echo "🐳 Testing Docker Configuration:"

# Test docker-compose config
if command -v docker-compose >/dev/null 2>&1; then
    echo "📋 Validating docker-compose configuration..."
    if docker-compose config >/dev/null 2>&1; then
        echo "✅ Docker Compose configuration is valid"
        
        # Show environment variables that will be passed to container
        echo ""
        echo "🔧 Environment variables for container:"
        docker-compose config | grep -A 20 "environment:" | grep -E "(ANTHROPIC|CLAUDE)" || echo "   No Anthropic/Claude variables found"
        
    else
        echo "❌ Docker Compose configuration is invalid"
    fi
else
    echo "⚠️  Docker Compose not available"
fi

echo ""
echo "🎯 Next Steps:"
echo "   1. If API test failed, check your ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL"
echo "   2. Build and run the container: make build && make up"
echo "   3. Check container logs: make logs"
echo "   4. Test the application: curl http://localhost:3008/api/config"
