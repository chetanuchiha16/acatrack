# --- Stage 1: Build the Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend dependency files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source files
COPY frontend/ ./

# Build the frontend with empty VITE_API_BASE to route queries relatively
ENV VITE_API_BASE=""
RUN npm run build

# --- Stage 2: Serve Backend & Frontend via FastAPI ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy python dependencies list
COPY backend/pyproject.toml backend/uv.lock ./backend/
WORKDIR /app/backend
RUN uv sync --frozen --no-install-project

# Copy backend application files
COPY backend/ /app/backend/

# Copy built frontend assets from Stage 1 into the backend/frontend/dist directory
COPY --from=frontend-builder /app/frontend/dist /app/backend/frontend/dist

# Expose Hugging Face Space default port
EXPOSE 7860

# Run Uvicorn server serving main:app on port 7860
CMD ["/app/backend/.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
