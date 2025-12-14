.PHONY: up up-d down logs clean help

# Default target
help:
	@echo "Available commands:"
	@echo "  make up        - Start all services with build"
	@echo "  make up-d      - Start all services in detached mode"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View all logs"
	@echo "  make clean     - Stop and remove volumes/images"
	@echo ""
	@echo "Service-specific commands:"
	@echo "  make logs-[service]    - View logs for specific service"
	@echo "  make shell-[service]   - Open shell in service container"
	@echo "  make rebuild-[service] - Rebuild specific service"

# Start all services
up:
	docker-compose up --build

# Start in detached mode
up-d:
	docker-compose up -d --build

# Stop all services
down:
	docker-compose down

# View all logs
logs:
	docker-compose logs -f

# Clean up everything
clean:
	docker-compose down -v --rmi local
	@echo "Cleaned up containers, volumes, and local images"

# Service-specific targets
logs-frontend:
	docker-compose logs -f frontend

shell-frontend:
	docker-compose exec frontend sh

rebuild-frontend:
	docker-compose up -d --build frontend
logs-backend:
	docker-compose logs -f backend

shell-backend:
	docker-compose exec backend sh

rebuild-backend:
	docker-compose up -d --build backend
logs-db:
	docker-compose logs -f db

shell-db:
	docker-compose exec db sh

rebuild-db:
	docker-compose up -d --build db
