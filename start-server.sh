#!/bin/bash

# Check if MCP_RUNTIME is set, default to auto
MCP_RUNTIME=${MCP_RUNTIME:-auto}

echo "Starting DealMate MCP Server..."

# Try Node.js launcher first
if command -v node >/dev/null 2>&1; then
    node start-server.js
elif command -v python3 >/dev/null 2>&1; then
    python3 start-server.py
elif command -v python >/dev/null 2>&1; then
    python start-server.py
else
    echo "Error: Neither Node.js nor Python found"
    echo "Please install Node.js or Python to run the server"
    exit 1
fi