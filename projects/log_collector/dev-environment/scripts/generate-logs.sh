#!/bin/bash

# Log Generator Script for Issue #15 Container Environment
# Generates realistic log files with TrackID and ProgramID patterns

LOG_DIR="/var/log/app"
SYSTEM_LOG_DIR="/var/log"
TMP_LOG_DIR="/tmp/logs"

# Create log directories
mkdir -p "$LOG_DIR" "$TMP_LOG_DIR"

# Arrays for realistic log generation
TRACK_IDS=("ABC123" "XYZ456" "DEF789" "GHI012" "JKL345" "MNO678" "PQR901" "STU234" "VWX567" "YZA890")
PROGRAM_IDS=("AUTH101" "DB503" "API001" "UI204" "SVC305" "QUEUE99" "CACHE42" "LOG888" "ADMIN77" "BACKUP55")
LOG_LEVELS=("DEBUG" "INFO" "WARN" "ERROR")
SERVICES=("authentication" "database" "api-gateway" "user-interface" "background-service" "queue-processor" "cache-manager")
EVENTS=("request processed" "connection established" "data synchronized" "cache updated" "job completed" "session created" "validation passed" "backup finished")

# Function to generate random timestamp within last 24 hours
generate_timestamp() {
    local seconds_ago=$((RANDOM % 86400))  # Random seconds in last 24 hours
    date -d "$seconds_ago seconds ago" '+%Y-%m-%d %H:%M:%S'
}

# Function to generate random log entry
generate_log_entry() {
    local track_id=${TRACK_IDS[$((RANDOM % ${#TRACK_IDS[@]}))]}
    local program_id=${PROGRAM_IDS[$((RANDOM % ${#PROGRAM_IDS[@]}))]}
    local log_level=${LOG_LEVELS[$((RANDOM % ${#LOG_LEVELS[@]}))]}
    local service=${SERVICES[$((RANDOM % ${#SERVICES[@]}))]}
    local event=${EVENTS[$((RANDOM % ${#EVENTS[@]}))]}
    local timestamp=$(generate_timestamp)

    # Random log format selection
    case $((RANDOM % 4)) in
        0)
            # Standard format with TrackID
            echo "$timestamp $log_level [$program_id] $service: $event TrackID: $track_id"
            ;;
        1)
            # Bracketed timestamp format
            echo "[$timestamp] $log_level $program_id - $service $event (TrackID: $track_id)"
            ;;
        2)
            # System log format
            echo "$(date '+%b %d %H:%M:%S') $(hostname) $program_id: $log_level - $service $event TrackID: $track_id"
            ;;
        3)
            # JSON-like format
            echo "{\"timestamp\":\"$timestamp\",\"level\":\"$log_level\",\"programId\":\"$program_id\",\"trackId\":\"$track_id\",\"service\":\"$service\",\"message\":\"$event\"}"
            ;;
    esac
}

# Function to generate application log
generate_application_log() {
    local log_file="$1"
    local entry_count=${2:-100}

    echo "Generating $entry_count entries in $log_file"

    for ((i=1; i<=entry_count; i++)); do
        generate_log_entry >> "$log_file"
    done
}

# Function to generate continuous logs (for daemon mode)
generate_continuous_logs() {
    local log_file="$1"
    local interval=${2:-5}  # Default 5 seconds

    echo "Starting continuous log generation to $log_file (interval: ${interval}s)"

    while true; do
        generate_log_entry >> "$log_file"
        sleep $interval
    done
}

# Main execution
case "${1:-batch}" in
    "batch")
        echo "🚀 Generating batch logs for Issue #15 testing..."

        # Generate various log files
        generate_application_log "$LOG_DIR/application.log" 200
        generate_application_log "$LOG_DIR/server1.log" 150
        generate_application_log "$LOG_DIR/server2.log" 150
        generate_application_log "$LOG_DIR/server3.log" 150
        generate_application_log "$TMP_LOG_DIR/temp1.log" 100
        generate_application_log "$TMP_LOG_DIR/temp2.log" 100
        generate_application_log "$SYSTEM_LOG_DIR/system.log" 80

        # Create some logs with specific patterns for testing
        echo "2023-11-22 10:30:15 INFO [AUTH101] authentication: login successful TrackID: TEST001" >> "$LOG_DIR/application.log"
        echo "2023-11-22 10:31:20 ERROR [DB503] database: connection timeout TrackID: TEST002" >> "$LOG_DIR/application.log"
        echo "2023-11-22 10:32:10 WARN [API001] api-gateway: rate limit exceeded TrackID: TEST003" >> "$LOG_DIR/application.log"

        echo "✅ Batch log generation completed"
        echo "📊 Generated logs:"
        echo "   - $LOG_DIR/application.log: $(wc -l < "$LOG_DIR/application.log") lines"
        echo "   - $LOG_DIR/server1.log: $(wc -l < "$LOG_DIR/server1.log") lines"
        echo "   - $LOG_DIR/server2.log: $(wc -l < "$LOG_DIR/server2.log") lines"
        echo "   - $LOG_DIR/server3.log: $(wc -l < "$LOG_DIR/server3.log") lines"
        echo "   - $TMP_LOG_DIR/temp1.log: $(wc -l < "$TMP_LOG_DIR/temp1.log") lines"
        echo "   - $TMP_LOG_DIR/temp2.log: $(wc -l < "$TMP_LOG_DIR/temp2.log") lines"
        ;;

    "continuous")
        echo "🔄 Starting continuous log generation..."
        generate_continuous_logs "$LOG_DIR/application.log" 3 &
        generate_continuous_logs "$LOG_DIR/server1.log" 5 &
        generate_continuous_logs "$LOG_DIR/server2.log" 7 &
        generate_continuous_logs "$LOG_DIR/server3.log" 10 &

        echo "✅ Continuous log generation started (background processes)"
        echo "📝 Logs will be written to:"
        echo "   - $LOG_DIR/application.log (every 3s)"
        echo "   - $LOG_DIR/server1.log (every 5s)"
        echo "   - $LOG_DIR/server2.log (every 7s)"
        echo "   - $LOG_DIR/server3.log (every 10s)"

        # Keep the main process alive
        wait
        ;;

    "test")
        echo "🧪 Generating test-specific logs..."
        # Generate logs with specific TrackIDs and timestamps for testing
        test_log="$LOG_DIR/test.log"

        echo "2023-11-22 09:00:00 INFO [AUTH101] Test event 1 TrackID: ABC123" > "$test_log"
        echo "2023-11-22 09:15:00 WARN [DB503] Test event 2 TrackID: XYZ456" >> "$test_log"
        echo "2023-11-22 09:30:00 ERROR [API001] Test event 3 TrackID: DEF789" >> "$test_log"
        echo "2023-11-22 09:45:00 DEBUG [UI204] Test event 4 TrackID: ABC123" >> "$test_log"
        echo "2023-11-22 10:00:00 INFO [SVC305] Test event 5 TrackID: GHI012" >> "$test_log"

        echo "✅ Test logs generated in $test_log"
        ;;

    *)
        echo "Usage: $0 [batch|continuous|test]"
        echo "  batch      - Generate batch logs once (default)"
        echo "  continuous - Generate logs continuously in background"
        echo "  test       - Generate specific test logs"
        exit 1
        ;;
esac