.PHONY: help build up down logs restart clean migrate db-reset admin

# Colors for output
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

help: ## Show help
	@echo "$(GREEN)Available commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(RESET) %s\n", $1, $2}'

build: ## Build Docker images
	@echo "$(GREEN)Building Docker images...$(RESET)"
	docker-compose build

up: ## Start all services
	@echo "$(GREEN)Starting services...$(RESET)"
	docker-compose up -d

down: ## Stop all services
	@echo "$(RED)Stopping services...$(RESET)"
	docker-compose down

logs: ## Show logs for all services
	docker-compose logs -f

logs-app: ## Show logs for application only
	docker-compose logs -f typedrasill-service

restart: ## Restart all services
	@echo "$(YELLOW)Restarting services...$(RESET)"
	docker-compose restart

clean: ## Clean all containers and volumes
	@echo "$(RED)Cleaning containers and volumes...$(RESET)"
	docker-compose down -v --remove-orphans
	docker system prune -f

migrate: ## Run database migrations
	@echo "$(GREEN)Running migrations...$(RESET)"
	docker-compose exec typedrasill-service bun db:migrate

db-generate: ## Generate new migration
	@echo "$(GREEN)Generating migration...$(RESET)"
	docker-compose exec typedrasill-service bun db:generate

db-push: ## Push schema changes directly to database
	@echo "$(GREEN)Pushing schema changes...$(RESET)"
	docker-compose exec typedrasill-service bun db:push

db-studio: ## Open Drizzle Studio
	@echo "$(GREEN)Opening Drizzle Studio...$(RESET)"
	@echo "$(YELLOW)Studio will be available at: http://localhost:4983$(RESET)"
	docker-compose exec typedrasill-service bun db:studio

db-reset: ## Reset database and apply migrations
	@echo "$(RED)Resetting database...$(RESET)"
	docker-compose exec typedrasill-postgre psql -U ${DB_USERNAME:-postgres} -d ${DB_NAME:-typedrasil-dev} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	docker-compose exec typedrasill-service bun db:migrate

admin: ## Start admin panels (Adminer + Redis Commander)
	@echo "$(GREEN)Starting admin panels...$(RESET)"
	@echo "$(YELLOW)Adminer will be available at: http://localhost:8080$(RESET)"
	@echo "$(YELLOW)Redis Commander will be available at: http://localhost:8081$(RESET)"
	docker-compose --profile admin up -d adminer redis-commander

dev: ## Start in development mode
	@echo "$(GREEN)Starting in development mode...$(RESET)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

prod: build up ## Start in production mode

status: ## Show services status
	docker-compose ps

shell: ## Connect to application container
	docker-compose exec typedrasill-service sh

db-shell: ## Connect to PostgreSQL
	docker-compose exec typedrasill-postgre psql -U ${DB_USERNAME:-postgres} -d ${DB_NAME:-typedrasil-dev}

redis-shell: ## Connect to Redis
	docker-compose exec typedrasill-redis redis-cli