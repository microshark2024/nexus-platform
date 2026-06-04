# Root Dockerfile for unified deployment of both Frontend and Backend

# --- Stage 1: Build the Next.js Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source code
COPY frontend/ .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Environment variables must be set at build time for client-side static rendering
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BACKEND_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Build and export static assets (Next.js will output to out/ directory)
RUN npm run build


# --- Stage 2: Create Python FastAPI Runner ---
FROM python:3.10-slim AS backend-runner
WORKDIR /app

# Install system dependencies (e.g. curl for health check)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend code
COPY backend/app ./app

# Copy compiled static frontend assets from Stage 1 into the FastAPI app/static directory
COPY --from=frontend-builder /app/frontend/out ./app/static

# Expose port (GCP Cloud Run defaults to port 8080)
EXPOSE 8080

# Run FastAPI via uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
