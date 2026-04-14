FROM python:3.12-slim

WORKDIR /app

# System deps (for psycopg2, Tesseract, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc libpq-dev tesseract-ocr curl && \
    rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install Python dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Copy app code
COPY . .

# Create necessary directories
RUN mkdir -p Outputs/PDFs Outputs/Images Outputs/NOTES Inputs/ExcelSheet

EXPOSE 8000

# Use uvicorn for production
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
