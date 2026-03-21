# Makefile for Student Result Project

.PHONY: help install backend frontend run test benchmark load-test clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install     - Install dependencies for both backend and frontend"
	@echo "  make backend     - Run the Flask backend"
	@echo "  make frontend    - Run the Vite frontend"
	@echo "  make run         - Run both backend and frontend concurrently"
	@echo "  make test        - Run backend tests"
	@echo "  make benchmark   - Run the python benchmark script"
	@echo "  make load-test   - Run the javascript load test"
	@echo "  make clean       - Remove cache files"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && uv sync
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Run backend
backend:
	@echo "Starting backend..."
	cd backend && uv run python app.py

# Run frontend
frontend:
	@echo "Starting frontend..."
	cd frontend && npm run dev

# Run both backend and frontend
run:
	@echo "Starting both backend and frontend..."
	(cd backend && uv run python app.py) & (cd frontend && npm run dev)

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && uv run pytest

# Run benchmark
benchmark:
	@echo "Running benchmark..."
	uv run benchmarkv2.py

# Run load test
load-test:
	@echo "Running load test..."
	k6 run load_testv2.js

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -rf backend/.venv frontend/node_modules
