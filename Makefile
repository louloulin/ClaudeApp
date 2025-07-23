# Claude Code UI Docker Management
# Usage: make <target>

.PHONY: help setup up down logs restart clean build config

# Default target
help: ## Show this help message
	@echo "Claude Code UI Docker Management"
	@echo "================================"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Setup environment configuration
	@echo "🔧 Setting up environment..."
	@./setup-env.sh

build: ## Build the Docker image
	@echo "🏗️  Building Docker image..."
	@docker-compose build

up: ## Start the services
	@echo "🚀 Starting services..."
	@docker-compose up -d
	@echo "✅ Services started at http://localhost:3008"

down: ## Stop and remove containers
	@echo "🛑 Stopping services..."
	@docker-compose down

logs: ## Show logs from all services
	@echo "📋 Showing logs..."
	@docker-compose logs -f

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	@docker-compose restart

clean: ## Remove containers, networks, and volumes
	@echo "🧹 Cleaning up..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f

config: ## Validate docker-compose configuration
	@echo "✅ Validating configuration..."
	@docker-compose config

status: ## Show service status
	@echo "📊 Service status:"
	@docker-compose ps

shell: ## Access the container shell
	@echo "🐚 Accessing container shell..."
	@docker-compose exec claude-code-ui bash

install: ## Complete installation (setup + build + start)
	@echo "📦 Installing Claude Code UI..."
	@make setup
	@make build
	@make up
	@echo ""
	@echo "🎉 Installation complete!"
	@echo "📱 Access the UI at: http://localhost:3008"

update: ## Update and restart services
	@echo "⬆️  Updating services..."
	@docker-compose pull
	@docker-compose up -d
	@echo "✅ Services updated"

health: ## Check service health
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:3008/api/config || echo "❌ Service not responding"

backup: ## Create backup of data and sessions
	@echo "💾 Creating backup..."
	@mkdir -p backups
	@tar -czf backups/claude-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz data sessions workspace
	@echo "✅ Backup created in backups/ directory"