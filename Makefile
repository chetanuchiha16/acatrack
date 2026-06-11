# Makefile for Student Result Project

.PHONY: help install backend frontend run test benchmark load-test clean docker-build docker-up docker-down docker-logs docker-status ci fix

# Default target
help:
	@echo "Available commands:"
	@echo "  make install      - Install dependencies for both backend and frontend"
	@echo "  make backend      - Run the FastAPI backend locally"
	@echo "  make frontend     - Run the Vite frontend locally"
	@echo "  make run          - Run both backend and frontend locally"
	@echo "  make test         - Run backend tests"
	@echo "  make ci           - Run all CI/CD quality gates locally (lint, typecheck, build, test)"
	@echo "  make fix          - Automatically fix lint and format errors on both backend and frontend"
	@echo "  make benchmark    - Run the python benchmark script"
	@echo "  make load-test    - Run the javascript load test"
	@echo "  make docker-build - Build docker images"
	@echo "  make docker-up    - Start docker containers"
	@echo "  make docker-down  - Stop docker containers"
	@echo "  make docker-logs  - View docker logs"
	@echo "  make docker-status- Check docker container status"
	@echo "  make clean        - Remove cache files"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && uv sync
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Run backend (development)
backend:
	@echo "Starting backend..."
	cd backend && uv run uvicorn main:app --reload --port 5000

# Run backend (production-tuned)
backend-prod:
	@echo "Starting production backend..."
	cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 5000 --workers 2 --loop uvloop --http httptools

# Run frontend
frontend:
	@echo "Starting frontend..."
	cd frontend && npm run dev

# Run both backend and frontend
run:
	@echo "Starting both backend and frontend..."
	(cd backend && uv run uvicorn main:app --reload --port 5000) & (cd frontend && npm run dev)

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && uv run pytest

# Run all local CI/CD gates consecutively
ci:
	@echo "=== [1/6] Running Backend Lint Checks (Ruff) ==="
	cd backend && uv run ruff check .
	@echo "=== [2/6] Running Backend Format Checks (Ruff) ==="
	cd backend && uv run ruff format --check .
	@echo "=== [3/6] Running Backend Tests (Pytest) ==="
	cd backend && uv run pytest --tb=short -q
	@echo "=== [4/6] Running Frontend Lint Checks (ESLint) ==="
	cd frontend && npm run lint
	@echo "=== [5/6] Running Frontend TypeScript Checks (tsc) ==="
	cd frontend && npx tsc --noEmit
	@echo "=== [6/6] Running Frontend Production Build (Vite) ==="
	cd frontend && npm run build
	@echo "🎉 All local CI/CD quality gates passed successfully! Safe to commit and open a PR. ✅"

# Automatically fix linting and formatting issues
fix:
	@echo "=== Fixing Backend Linting & Formatting (Ruff) ==="
	cd backend && uv run ruff check . --fix
	cd backend && uv run ruff format .
	@echo "=== Fixing Frontend Linting & Formatting (ESLint) ==="
	cd frontend && npx eslint . --fix
	@echo "🎉 All auto-fixable linting and formatting issues resolved! ✅"

# Run benchmark
benchmark:
	@echo "Running benchmark..."
	uv run benchmarks/benchmarkv2.py

# Run load test
load-test:
	@echo "Running load test..."
	k6 run load_tests/load_testv2.js

# Run sandbox load test
load-test-sandbox:
	@echo "Running sandbox load test..."
	k6 run load_tests/load_test_sandbox.js

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -rf backend/.venv frontend/node_modules

# Docker commands
docker-build:
	@echo "Building Docker images..."
	docker compose build

docker-up:
	@echo "Starting Docker containers..."
	docker compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	docker compose down

docker-logs:
	@echo "Viewing Docker logs..."
	docker compose logs -f

docker-status:
	@echo "Checking container status..."
	docker compose ps
