#!/bin/bash

# Diverse Log Generator Script for Issue #15
# Generates different log patterns for each server while maintaining same TrackIDs

LOG_DIR="/var/log/app"
SYSTEM_LOG_DIR="/var/log"
TMP_LOG_DIR="/tmp/logs"

# Create log directories
mkdir -p "$LOG_DIR" "$TMP_LOG_DIR"

# TrackIDs with server-specific distribution
# Server1 focuses on: ABC123, GHI012, JKL345 (from tasks)
# Server2 focuses on: XYZ456, GHI012, JKL345 (from tasks)
# Server3 focuses on: ABC123, XYZ456, JKL345 (from tasks)
ALL_TRACK_IDS=("ABC123" "XYZ456" "DEF789" "GHI012" "JKL345" "MNO678" "TEST001" "TEST002" "TEST003")

# Get server ID from hostname or container name
SERVER_ID=$(hostname | grep -o 'server[0-9]' || echo "server1")

# Function to generate random timestamp within last 24 hours
generate_timestamp() {
    local seconds_ago=$((RANDOM % 86400))
    date -d "$seconds_ago seconds ago" '+%Y-%m-%d %H:%M:%S'
}

# Function to get server-specific TrackID distribution
get_random_trackid() {
    local server_type="${SERVER_ID:-server1}"

    case "$server_type" in
        "server1")
            # Server1: Exclusively focus on ABC123 (70%), some GHI012 (30%)
            local weight=$((RANDOM % 100))
            if [ $weight -lt 70 ]; then
                echo "ABC123"
            else
                echo "GHI012"
            fi
            ;;
        "server2")
            # Server2: Exclusively focus on XYZ456 (70%), some GHI012 (30%)
            local weight=$((RANDOM % 100))
            if [ $weight -lt 70 ]; then
                echo "XYZ456"
            else
                echo "GHI012"
            fi
            ;;
        "server3")
            # Server3: Exclusively focus on JKL345 (70%), some ABC123 (30%)
            local weight=$((RANDOM % 100))
            if [ $weight -lt 70 ]; then
                echo "JKL345"
            else
                echo "ABC123"
            fi
            ;;
        *)
            echo ${ALL_TRACK_IDS[$((RANDOM % ${#ALL_TRACK_IDS[@]}))]}
            ;;
    esac
}

# Server 1: Web Server Logs (Apache/Nginx style)
generate_server1_log() {
    local log_file="$1"
    local entry_count=${2:-100}

    echo "Generating $entry_count Web Server log entries in $log_file"

    # Server 1 specific arrays
    local HTTP_METHODS=("GET" "POST" "PUT" "DELETE" "PATCH")
    local HTTP_CODES=("200" "201" "400" "401" "403" "404" "500" "502")
    local ENDPOINTS=("/api/auth" "/api/users" "/api/orders" "/api/products" "/health" "/metrics")
    local USER_AGENTS=("Mozilla/5.0" "Chrome/91.0" "Safari/14.1" "PostmanRuntime" "curl/7.68")
    local LOG_LEVELS=("INFO" "WARN" "ERROR" "DEBUG")

    for ((i=1; i<=entry_count; i++)); do
        local track_id=$(get_random_trackid)
        local timestamp=$(generate_timestamp)
        local method=${HTTP_METHODS[$((RANDOM % ${#HTTP_METHODS[@]}))]}
        local endpoint=${ENDPOINTS[$((RANDOM % ${#ENDPOINTS[@]}))]}
        local http_code=${HTTP_CODES[$((RANDOM % ${#HTTP_CODES[@]}))]}
        local user_agent=${USER_AGENTS[$((RANDOM % ${#USER_AGENTS[@]}))]}
        local level=${LOG_LEVELS[$((RANDOM % ${#LOG_LEVELS[@]}))]}
        local response_time=$((RANDOM % 5000 + 10))
        local client_ip="192.168.1.$((RANDOM % 254 + 1))"

        # Various web server log formats
        case $((RANDOM % 3)) in
            0)
                # Apache Combined Log Format with TrackID
                echo "$client_ip - - [$timestamp] \"$method $endpoint HTTP/1.1\" $http_code $response_time \"$user_agent\" TrackID: $track_id"
                ;;
            1)
                # Nginx JSON style
                echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"method\":\"$method\",\"endpoint\":\"$endpoint\",\"status\":$http_code,\"response_time\":${response_time},\"client_ip\":\"$client_ip\",\"trackId\":\"$track_id\"}"
                ;;
            2)
                # Custom web server format
                echo "$timestamp [WEB01] $level: $method $endpoint -> $http_code (${response_time}ms) TrackID: $track_id ClientIP: $client_ip"
                ;;
        esac
    done >> "$log_file"
}

# Server 2: Database Server Logs (MySQL/PostgreSQL style)
generate_server2_log() {
    local log_file="$1"
    local entry_count=${2:-100}

    echo "Generating $entry_count Database Server log entries in $log_file"

    # Server 2 specific arrays
    local DB_OPERATIONS=("SELECT" "INSERT" "UPDATE" "DELETE" "CREATE" "ALTER")
    local DB_TABLES=("users" "orders" "products" "sessions" "audit_log" "cache_entries")
    local DB_LEVELS=("NOTICE" "WARNING" "ERROR" "FATAL" "INFO")
    local DB_COMPONENTS=("connection" "query_executor" "index_manager" "backup_service" "replication")
    local CONNECTION_STATES=("connected" "disconnected" "timeout" "established" "closed")

    for ((i=1; i<=entry_count; i++)); do
        local track_id=$(get_random_trackid)
        local timestamp=$(generate_timestamp)
        local operation=${DB_OPERATIONS[$((RANDOM % ${#DB_OPERATIONS[@]}))]}
        local table=${DB_TABLES[$((RANDOM % ${#DB_TABLES[@]}))]}
        local level=${DB_LEVELS[$((RANDOM % ${#DB_LEVELS[@]}))]}
        local component=${DB_COMPONENTS[$((RANDOM % ${#DB_COMPONENTS[@]}))]}
        local conn_state=${CONNECTION_STATES[$((RANDOM % ${#CONNECTION_STATES[@]}))]}
        local duration=$((RANDOM % 10000 + 1))
        local pid=$((RANDOM % 9999 + 1000))

        case $((RANDOM % 3)) in
            0)
                # PostgreSQL style log
                echo "$timestamp [DB503] [$pid] $level: $component $conn_state for table '$table' duration: ${duration}ms TrackID: $track_id"
                ;;
            1)
                # MySQL style log
                echo "$timestamp [$pid] [DB503] $level $component: $operation on $table completed (${duration}ms) TrackID: $track_id"
                ;;
            2)
                # Custom database format
                echo "[$timestamp] DB503.$component $level - Operation: $operation Table: $table Duration: ${duration}ms State: $conn_state TrackID: $track_id"
                ;;
        esac
    done >> "$log_file"
}

# Server 3: Application Server Logs (Java/Node.js style)
generate_server3_log() {
    local log_file="$1"
    local entry_count=${2:-100}

    echo "Generating $entry_count Application Server log entries in $log_file"

    # Server 3 specific arrays
    local APP_COMPONENTS=("OrderService" "UserController" "PaymentProcessor" "EmailService" "CacheManager")
    local APP_EVENTS=("processing_request" "validating_input" "calling_external_api" "updating_cache" "sending_notification")
    local APP_LEVELS=("TRACE" "DEBUG" "INFO" "WARN" "ERROR" "FATAL")
    local THREAD_NAMES=("http-nio-8080-exec" "scheduled-task-pool" "async-processor" "websocket-handler")
    local CLASS_NAMES=("com.company.OrderService" "com.company.UserController" "com.company.PaymentProcessor")

    for ((i=1; i<=entry_count; i++)); do
        local track_id=$(get_random_trackid)
        local timestamp=$(generate_timestamp)
        local component=${APP_COMPONENTS[$((RANDOM % ${#APP_COMPONENTS[@]}))]}
        local event=${APP_EVENTS[$((RANDOM % ${#APP_EVENTS[@]}))]}
        local level=${APP_LEVELS[$((RANDOM % ${#APP_LEVELS[@]}))]}
        local thread=${THREAD_NAMES[$((RANDOM % ${#THREAD_NAMES[@]}))]}
        local class_name=${CLASS_NAMES[$((RANDOM % ${#CLASS_NAMES[@]}))]}
        local thread_id=$((RANDOM % 999 + 1))
        local memory_usage=$((RANDOM % 1024 + 128))

        case $((RANDOM % 3)) in
            0)
                # Java/Spring Boot style (Logback)
                echo "$timestamp [$thread-$thread_id] $level $class_name - AUTH101: $component $event TrackID: $track_id Memory: ${memory_usage}MB"
                ;;
            1)
                # Node.js style
                echo "[$timestamp] $level AUTH101.$component: $event {trackId: \"$track_id\", thread: \"$thread-$thread_id\", memory: \"${memory_usage}MB\"}"
                ;;
            2)
                # Custom application format
                echo "$timestamp [AUTH101] $level [$thread-$thread_id] $component.$event TrackID: $track_id MemUsage: ${memory_usage}MB"
                ;;
        esac
    done >> "$log_file"
}

# Function to add specific test patterns for Issue #15 validation
add_test_patterns() {
    local server_type="$1"
    local log_file="$LOG_DIR/application.log"

    case "$server_type" in
        "server1")
            # Web server specific test patterns - focus on ABC123, GHI012, JKL345
            echo "$(date '+%Y-%m-%d %H:%M:%S') [WEB01] INFO: POST /api/auth -> 200 (245ms) TrackID: ABC123 ClientIP: 10.0.1.15" >> "$log_file"
            echo "$(date '+%Y-%m-%d %H:%M:%S') INFO AUTH101: session validation successful TrackID: GHI012 endpoint: /api/users" >> "$log_file"
            echo "$(date '+%Y-%m-%d %H:%M:%S') [WEB01] ERROR: GET /api/orders -> 500 (1250ms) TrackID: JKL345 ClientIP: 10.0.1.22" >> "$log_file"
            ;;
        "server2")
            # Database server specific test patterns - focus on XYZ456, GHI012, JKL345
            echo "$(date '+%Y-%m-%d %H:%M:%S') [5432] [DB503] INFO connection: SELECT on users completed (156ms) TrackID: XYZ456" >> "$log_file"
            echo "$(date '+%Y-%m-%d %H:%M:%S') DB503 INFO - Operation: UPDATE Table: sessions Duration: 89ms TrackID: GHI012" >> "$log_file"
            echo "$(date '+%Y-%m-%d %H:%M:%S') [5432] [DB503] WARNING: INSERT on orders timeout (3500ms) TrackID: JKL345" >> "$log_file"
            ;;
        "server3")
            # Application server specific test patterns - focus on ABC123, XYZ456, JKL345
            echo "$(date '+%Y-%m-%d %H:%M:%S') [http-nio-8080-exec-15] INFO com.company.OrderService - AUTH101: processing_request TrackID: ABC123 Memory: 512MB" >> "$log_file"
            echo "$(date '+%Y-%m-%d %H:%M:%S') INFO AUTH101.UserController: validating_input {trackId: \"XYZ456\", thread: \"async-processor-3\", memory: \"256MB\"}" >> "$log_file"
            echo "$(date '+%Y-%m-%d %H:%M:%S') [scheduled-task-pool-42] ERROR com.company.PaymentProcessor - AUTH101: calling_external_api TrackID: JKL345 Memory: 768MB" >> "$log_file"
            ;;
    esac
}

# Main execution based on server type
case "${SERVER_ID:-server1}" in
    "server1")
        echo "🌐 Generating Web Server logs for $SERVER_ID..."
        generate_server1_log "$LOG_DIR/application.log" 150
        generate_server1_log "$LOG_DIR/access.log" 200
        generate_server1_log "$TMP_LOG_DIR/nginx.log" 100
        add_test_patterns "server1"
        ;;

    "server2")
        echo "🗃️  Generating Database Server logs for $SERVER_ID..."
        generate_server2_log "$LOG_DIR/application.log" 150
        generate_server2_log "$LOG_DIR/postgresql.log" 180
        generate_server2_log "$TMP_LOG_DIR/mysql.log" 120
        add_test_patterns "server2"
        ;;

    "server3")
        echo "⚙️  Generating Application Server logs for $SERVER_ID..."
        generate_server3_log "$LOG_DIR/application.log" 150
        generate_server3_log "$LOG_DIR/spring.log" 170
        generate_server3_log "$TMP_LOG_DIR/app.log" 110
        add_test_patterns "server3"
        ;;

    *)
        # Default to server1 pattern if hostname detection fails
        echo "🔧 Unknown server type, defaulting to Web Server logs..."
        generate_server1_log "$LOG_DIR/application.log" 150
        add_test_patterns "server1"
        ;;
esac

echo "✅ Diverse log generation completed for $SERVER_ID"
echo "📊 Generated logs with server-specific patterns:"
ls -la "$LOG_DIR"/ "$TMP_LOG_DIR"/ 2>/dev/null | grep -E '\.(log)$' | while read -r line; do
    echo "   - $line"
done