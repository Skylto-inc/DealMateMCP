#!/usr/bin/env python3

import os
import sys
import subprocess
import shutil
from pathlib import Path

class ServerLauncher:
    def __init__(self):
        self.preferred_runtime = os.getenv('MCP_RUNTIME', 'auto')
        self.script_dir = Path(__file__).parent
    
    def check_runtime(self, command):
        """Check if a runtime is available"""
        try:
            result = subprocess.run([command, '--version'], 
                                  capture_output=True, timeout=5)
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def detect_available_runtimes(self):
        """Detect available runtimes"""
        runtimes = {
            'node': self.check_runtime('node'),
            'python': self.check_runtime('python') or self.check_runtime('python3')
        }
        
        available = [runtime for runtime, available in runtimes.items() if available]
        print(f"Available runtimes: {', '.join(available) if available else 'none'}", 
              file=sys.stderr)
        
        return runtimes
    
    def start_server(self):
        """Start the appropriate server"""
        runtimes = self.detect_available_runtimes()
        server_command = None
        server_args = []
        server_file = None
        
        # Determine which server to run
        if self.preferred_runtime == 'python' and runtimes['python']:
            python_cmd = 'python3' if self.check_runtime('python3') else 'python'
            server_command = python_cmd
            server_args = ['main.py']
            server_file = 'Python'
        elif self.preferred_runtime == 'node' and runtimes['node']:
            server_command = 'node'
            server_args = ['mcp-server.js']
            server_file = 'Node.js'
        elif self.preferred_runtime == 'auto':
            # Auto-detect: prefer Node.js, fallback to Python
            if runtimes['node']:
                server_command = 'node'
                server_args = ['mcp-server.js']
                server_file = 'Node.js'
            elif runtimes['python']:
                python_cmd = 'python3' if self.check_runtime('python3') else 'python'
                server_command = python_cmd
                server_args = ['main.py']
                server_file = 'Python'
        
        if not server_command:
            print("Error: No suitable runtime found or specified runtime not available", 
                  file=sys.stderr)
            print("Available options:", file=sys.stderr)
            if runtimes['node']:
                print("  - Set MCP_RUNTIME=node to use Node.js", file=sys.stderr)
            if runtimes['python']:
                print("  - Set MCP_RUNTIME=python to use Python", file=sys.stderr)
            sys.exit(1)
        
        print(f"Starting DealMate MCP Server using {server_file}...", file=sys.stderr)
        
        # Start the server
        try:
            subprocess.run([server_command] + server_args, cwd=self.script_dir)
        except KeyboardInterrupt:
            print("Server shutdown requested", file=sys.stderr)
        except Exception as e:
            print(f"Failed to start server: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    launcher = ServerLauncher()
    launcher.start_server()