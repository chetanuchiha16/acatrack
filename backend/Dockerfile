# Use official lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system utilities and build dependencies
# Need some build tools (gcc, libpq-dev) if we have C-extensions or Postgres
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv (frozen = respect lockfile exactly)
RUN uv sync --frozen --no-dev --no-editable

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Run the backend service via the uv-managed venv
CMD ["uv", "run", "python", "app.py"]
