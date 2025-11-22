# Log Collector Tool - Issue #15 Implementation
FROM node:18-alpine

# Install system dependencies including SSH server
RUN apk add --no-cache \
    bash \
    jq \
    coreutils \
    grep \
    sed \
    gawk \
    tzdata \
    openssh-server \
    openssh-keygen \
    sudo

# Create non-root user
RUN addgroup -g 2000 logcollector && \
    adduser -D -u 2000 -G logcollector logcollector

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY client/package*.json ./client/

# Install dependencies
RUN cd client && npm install

# Copy client application files
COPY client/ ./client/

# Copy dev-environment files
COPY dev-environment/ ./dev-environment/

# Create necessary directories with proper permissions
RUN mkdir -p client/output client/examples /var/log/app /tmp/logs && \
    chmod 777 client/output client/examples /var/log/app /tmp/logs && \
    chown -R logcollector:logcollector /app

# Make scripts executable (only for files that exist)
RUN chmod +x client/log-collection-skill.js dev-environment/scripts/generate-logs.sh dev-environment/scripts/startup.sh 2>/dev/null || true

# Configure SSH properly for container use
RUN mkdir -p /run/sshd && \
    chmod 755 /run/sshd

# Keep running as root to allow SSH daemon startup
# USER logcollector  # Commented out - run as root to start SSH daemon

# Set environment variables
ENV NODE_ENV=production \
    TZ=UTC \
    INPUT_FOLDER=./examples \
    OUTPUT_FOLDER=./output

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && bash --version || exit 1

# Default command: run startup script with log generation
CMD ["/app/dev-environment/scripts/startup.sh"]

# Labels
LABEL maintainer="Log Collector Tool - Issue #15" \
      version="1.0.0" \
      description="Issue #15 Log Collection Skill Implementation"