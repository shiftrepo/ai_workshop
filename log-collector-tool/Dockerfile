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

# Create necessary directories for mounting
RUN mkdir -p /app/scripts /app/dev-scripts /app/examples /app/output /var/log/app /tmp/logs /app/.ssh && \
    chmod 755 /app/scripts /app/dev-scripts /app/examples /app/output /var/log/app /tmp/logs /app/.ssh && \
    chown -R logcollector:logcollector /app

# Install Node.js dependencies placeholder (will be handled via mounted volume or init script)
# Dependencies will be installed at runtime when volume is mounted
# Script permissions will be handled by entrypoint when files are mounted

# Configure SSH properly for container use
RUN mkdir -p /run/sshd && \
    chmod 755 /run/sshd

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment variables (mount mode compatible)
ENV NODE_ENV=production \
    TZ=UTC \
    INPUT_FOLDER=/app/examples \
    OUTPUT_FOLDER=/app/output \
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