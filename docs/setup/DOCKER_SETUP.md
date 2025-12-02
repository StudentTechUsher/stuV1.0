# Docker Setup Guide

This guide explains how to run the application in Docker and avoid common native module issues.

## The Native Module Issue

**Problem:** `lightningcss` and other native Node.js modules must be compiled for the specific architecture where they run. If you install dependencies on macOS and then mount them into a Linux Docker container, you'll get errors like:

```
Error: Cannot find module '../lightningcss.linux-arm64-gnu.node'
```

## Quick Start

### Production Build

```bash
# Build the production image
docker build -t stu-app .

# Run the container
docker run -p 3000:3000 --env-file .env.local stu-app
```

Or use docker-compose:

```bash
# Production mode
docker-compose up app

# Development mode (with hot reload)
docker-compose up app-dev
```

## How the Fix Works

### 1. **Multi-Stage Build**
The Dockerfile uses a multi-stage build that:
- Installs dependencies inside the container (not from host)
- Builds the application inside the container
- Creates a clean runtime image

### 2. **Native Module Rebuild**
The `npm rebuild` command in the Dockerfile ensures all native modules are rebuilt for the container's architecture.

### 3. **.dockerignore**
Prevents `node_modules` and `.next` from being copied from the host machine.

### 4. **Volume Mounting Strategy**
When using Docker Compose for development:
- Mounts source code for hot reloading
- Uses anonymous volumes to prevent host `node_modules` from overriding container's:
  ```yaml
  volumes:
    - .:/app
    - /app/node_modules  # Anonymous volume prevents override
    - /app/.next         # Anonymous volume prevents override
  ```

## Common Mistakes to Avoid

### ❌ Don't Do This

```bash
# Installing dependencies on host, then running in Docker
npm install  # On macOS
docker run -v $(pwd):/app ...  # Mounts macOS node_modules into Linux container
```

### ✅ Do This Instead

```bash
# Let Docker handle dependencies
docker build -t stu-app .
docker run -p 3000:3000 stu-app
```

## Development Workflow

### Option 1: Docker Compose (Recommended)

```bash
# Start development server
docker-compose up app-dev

# Rebuild after dependency changes
docker-compose build app-dev
docker-compose up app-dev
```

### Option 2: Without Docker Compose

```bash
# Build the image
docker build --target builder -t stu-app-dev .

# Run with proper volume mounting
docker run -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  -v /app/.next \
  --env-file .env.local \
  stu-app-dev \
  npm run dev
```

## Rebuilding After Dependency Changes

When you add or update dependencies in `package.json`:

```bash
# Using docker-compose
docker-compose build --no-cache app

# Using docker directly
docker build --no-cache -t stu-app .
```

## Troubleshooting

### Issue: Still getting native module errors

**Cause:** Old build cache or host node_modules interfering

**Solution:**
```bash
# Clean everything
rm -rf node_modules .next

# Rebuild without cache
docker-compose build --no-cache app
docker-compose up app
```

### Issue: Changes not reflected in development

**Cause:** Volume mounting not working correctly

**Solution:**
```bash
# Check volume mounts
docker-compose config

# Ensure app-dev service uses proper volumes
# Should see:
#   - .:/app
#   - /app/node_modules
#   - /app/.next
```

### Issue: Build fails with "Cannot find module"

**Cause:** Dependencies not installed properly

**Solution:**
```bash
# Check that .dockerignore excludes node_modules
cat .dockerignore | grep node_modules

# Should see: node_modules

# Rebuild from scratch
docker-compose build --no-cache
```

## Best Practices

1. **Never mix host and container dependencies**
   - Don't run `npm install` on host if using Docker
   - Or use separate node_modules: `node_modules.local` for host dev

2. **Use .dockerignore**
   - Ensures clean builds
   - Prevents host artifacts from contaminating container

3. **Rebuild native modules**
   - The Dockerfile includes `npm rebuild` after copying source
   - This ensures native modules match container architecture

4. **Use multi-stage builds**
   - Keeps production image small
   - Separates build and runtime dependencies

5. **Layer caching**
   - Copy `package*.json` before source code
   - Allows Docker to cache dependency installation
   - Only rebuilds dependencies when package files change

## Environment Variables

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

# OpenAI
OPENAI_API_KEY=your-key

# Environment
NEXT_PUBLIC_ENV=production
```

Mount it in docker-compose.yml or pass with `--env-file`.

## Production Deployment

### Using Docker

```bash
# Build optimized production image
docker build -t stu-app:latest .

# Run in production
docker run -d \
  -p 3000:3000 \
  --name stu-app \
  --restart unless-stopped \
  --env-file .env.production \
  stu-app:latest
```

### Using Docker Compose

```bash
docker-compose -f docker-compose.yml up -d app
```

## Summary

The key to avoiding daily native module issues:

1. ✅ Use the provided Dockerfile (includes `npm rebuild`)
2. ✅ Use docker-compose.yml with proper volume strategy
3. ✅ Never mount host `node_modules` into container
4. ✅ Rebuild Docker image after dependency changes
5. ✅ Use `.dockerignore` to exclude host build artifacts

By following these practices, your Docker setup will work reliably across different architectures (macOS, Linux, ARM64, x86_64) without daily rebuild issues.
