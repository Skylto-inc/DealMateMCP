#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

class ServerLauncher {
  constructor() {
    this.preferredRuntime = process.env.MCP_RUNTIME || 'auto';
  }

  async checkRuntime(command) {
    return new Promise((resolve) => {
      const child = spawn(command, ['--version'], { stdio: 'ignore' });
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });
  }

  async detectAvailableRuntimes() {
    const runtimes = {
      node: await this.checkRuntime('node'),
      python: await this.checkRuntime('python') || await this.checkRuntime('python3')
    };
    
    console.error('Available runtimes:', Object.entries(runtimes)
      .filter(([_, available]) => available)
      .map(([runtime]) => runtime)
      .join(', ') || 'none');
    
    return runtimes;
  }

  async startServer() {
    const runtimes = await this.detectAvailableRuntimes();
    let serverCommand, serverArgs, serverFile;

    // Determine which server to run
    if (this.preferredRuntime === 'python' && runtimes.python) {
      const pythonCmd = await this.checkRuntime('python3') ? 'python3' : 'python';
      serverCommand = pythonCmd;
      serverArgs = ['main.py'];
      serverFile = 'Python';
    } else if (this.preferredRuntime === 'node' && runtimes.node) {
      serverCommand = 'node';
      serverArgs = ['mcp-server.js'];
      serverFile = 'Node.js';
    } else if (this.preferredRuntime === 'auto') {
      // Auto-detect: prefer Node.js, fallback to Python
      if (runtimes.node) {
        serverCommand = 'node';
        serverArgs = ['mcp-server.js'];
        serverFile = 'Node.js';
      } else if (runtimes.python) {
        const pythonCmd = await this.checkRuntime('python3') ? 'python3' : 'python';
        serverCommand = pythonCmd;
        serverArgs = ['main.py'];
        serverFile = 'Python';
      }
    }

    if (!serverCommand) {
      console.error('Error: No suitable runtime found or specified runtime not available');
      console.error('Available options:');
      if (runtimes.node) console.error('  - Set MCP_RUNTIME=node to use Node.js');
      if (runtimes.python) console.error('  - Set MCP_RUNTIME=python to use Python');
      process.exit(1);
    }

    console.error(`Starting DealMate MCP Server using ${serverFile}...`);
    
    // Start the server
    const server = spawn(serverCommand, serverArgs, {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env }
    });

    server.on('error', (error) => {
      console.error(`Failed to start server: ${error.message}`);
      process.exit(1);
    });

    server.on('close', (code) => {
      console.error(`Server exited with code ${code}`);
      process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.error('Shutting down server...');
      server.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      console.error('Shutting down server...');
      server.kill('SIGTERM');
    });
  }
}

const launcher = new ServerLauncher();
launcher.startServer().catch(console.error);