# Build stage - Use smaller Node.js image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally (cache this layer)
RUN npm install -g pnpm@latest

# Copy package files first (better layer caching)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (cached if package files haven't changed)
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY . .

# Allow passing the API base URL at build time (e.g. http://1.2.3.4 for VPS deploy)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application with optimizations
RUN pnpm build && \
  # Remove source maps and unnecessary files to reduce size
  find dist -name "*.map" -delete && \
  # Remove any test files that might have been copied
  find dist -name "*.test.*" -delete

# Production stage - Minimal Node.js static server
FROM node:20-alpine AS production

# Install serve globally for SPA routing support
RUN npm install -g serve@14 && \
  addgroup -g 1001 -S appuser && \
  adduser -S -D -H -u 1001 -G appuser appuser && \
  # Clean up npm cache
  npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist /app

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user  
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start with serve (supports SPA routing out of the box)
CMD ["serve", "-s", "/app", "-l", "8080"]
