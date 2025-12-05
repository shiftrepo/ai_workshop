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

# Create necessary directories first
RUN mkdir -p scripts dev-scripts

# Copy package files first for better caching
COPY log-collector-skill/scripts/package*.json ./scripts/

# Install dependencies
RUN cd scripts && npm install

# Copy specific application files (avoid copying entire directory)
COPY log-collector-skill/scripts/ ./scripts/
COPY dev-environment/scripts/ ./dev-scripts/
COPY examples/ ./scripts/examples/

# Create necessary directories with proper permissions
RUN mkdir -p scripts/output scripts/examples /var/log/app /tmp/logs /app/.ssh && \
    chmod 755 scripts/output scripts/examples /var/log/app /tmp/logs /app/.ssh && \
    chown -R logcollector:logcollector /app

# Make scripts executable (check existence first)
RUN find /app -name "*.js" -type f -exec chmod +x {} \; 2>/dev/null || true && \
    find /app -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

# Configure SSH properly for container use
RUN mkdir -p /run/sshd && \
    chmod 755 /run/sshd

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment variables (externalized for Docker Hub)
ENV NODE_ENV=production \
    TZ=UTC \
    INPUT_FOLDER=./scripts/examples \
    OUTPUT_FOLDER=./scripts/output \
    SSH_HOST_1= \
    SSH_HOST_2= \
    SSH_HOST_3= \
    SSH_PORT_1=22 \
    SSH_PORT_2=22 \
    SSH_PORT_3=22 \
    SSH_USER=logcollector \
    CONTINUOUS_LOGS=false \
    LOG_SERVER_ID=server1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && bash --version || exit 1

# Default command: run unified entrypoint
CMD ["/entrypoint.sh"]

# Labels
LABEL maintainer="Log Collector Tool - Issue #15" \
      version="1.0.0" \
      description="Issue #15 Log Collection Skill Implementation - Docker Hub Ready"