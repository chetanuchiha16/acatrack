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

# Create a non-root user with UID 1000
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set environment variables for unbuffered output
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

# Set ownership of /app to the user
RUN chown user:user /app

# Switch to the non-root user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /app/backend

# Copy backend dependency list with user ownership
COPY --chown=user:user backend/pyproject.toml backend/uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen --no-install-project

# Copy backend application files with user ownership
COPY --chown=user:user backend/ /app/backend/

# Copy built frontend assets from Stage 1 into the backend/frontend/dist directory with user ownership
COPY --chown=user:user --from=frontend-builder /app/frontend/dist /app/backend/frontend/dist

# Create necessary directories and ensure user permissions
RUN mkdir -p /app/backend/Outputs/PDFs /app/backend/Outputs/Images /app/backend/Outputs/NOTES /app/backend/Inputs/ExcelSheet

# Expose Hugging Face Space default port
EXPOSE 7860

# Run Uvicorn server serving main:app on port 7860
CMD ["/app/backend/.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
