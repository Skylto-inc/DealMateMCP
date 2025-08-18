#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

// Simple MCP server implementation
const contextPath = process.env.MCP_CONTEXT_PATH || './context-index';

class DealMateMCPServer {
  constructor() {
    this.services = new Map();
  }

  async initialize() {
    await this.loadServices();
  }

  async loadServices() {
    try {
      const entries = await fs.readdir(contextPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const files = await this.getServiceFiles(entry.name);
          this.services.set(entry.name, files);
        }
      }
      
      console.error(`Loaded ${this.services.size} services with context`);
    } catch (error) {
      console.error('Error loading services:', error.message);
    }
  }

  async getServiceFiles(serviceName) {
    const servicePath = path.join(contextPath, serviceName);
    const files = [];
    
    async function scanDirectory(dirPath, relativePath = '') {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relPath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && 
              entry.name !== 'target' && entry.name !== 'node_modules' && 
              entry.name !== '__pycache__') {
            await scanDirectory(fullPath, relPath);
          } else if (entry.isFile() && (
            entry.name.endsWith('.rs') ||
            entry.name.endsWith('.py') ||
            entry.name.endsWith('.js') ||
            entry.name.endsWith('.ts') ||
            entry.name.endsWith('.json') ||
            entry.name.endsWith('.toml') ||
            entry.name.endsWith('.yml') ||
            entry.name.endsWith('.yaml') ||
            entry.name === 'Dockerfile' ||
            entry.name === 'README.md' ||
            entry.name === 'Cargo.toml' ||
            entry.name === 'package.json' ||
            entry.name === 'requirements.txt'
          )) {
            files.push({
              name: entry.name,
              path: relPath,
              fullPath: fullPath,
              service: serviceName
            });
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    await scanDirectory(servicePath);
    return files;
  }

  async getFileContent(filePath) {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot read file: ${error.message}`);
    }
  }

  // MCP Protocol handlers
  async handleListResources() {
    const resources = [];
    
    for (const [serviceName, files] of this.services) {
      for (const file of files) {
        resources.push({
          uri: `dealmate://${serviceName}/${file.path}`,
          name: `${serviceName}/${file.path}`,
          description: `${serviceName} - ${file.name}`,
          mimeType: this.getMimeType(file.name)
        });
      }
    }
    
    return { resources };
  }

  async handleReadResource(uri) {
    if (!uri.startsWith('dealmate://')) {
      throw new Error('Invalid URI scheme');
    }
    
    const resourcePath = uri.replace('dealmate://', '');
    const [serviceName, ...pathParts] = resourcePath.split('/');
    const filePath = pathParts.join('/');
    
    const serviceFiles = this.services.get(serviceName);
    if (!serviceFiles) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    
    const file = serviceFiles.find(f => f.path === filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = await this.getFileContent(file.fullPath);
    
    return {
      contents: [{
        uri,
        mimeType: this.getMimeType(file.name),
        text: content
      }]
    };
  }

  getMimeType(filename) {
    if (filename.endsWith('.rs')) return 'text/x-rust';
    if (filename.endsWith('.py')) return 'text/x-python';
    if (filename.endsWith('.js')) return 'text/javascript';
    if (filename.endsWith('.ts')) return 'text/typescript';
    if (filename.endsWith('.json')) return 'application/json';
    if (filename.endsWith('.md')) return 'text/markdown';
    if (filename.endsWith('.toml')) return 'text/x-toml';
    if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return 'text/yaml';
    return 'text/plain';
  }

  // Simple STDIO MCP implementation
  async run() {
    await this.initialize();
    
    console.error('DealMate MCP Server started');
    console.error(`Serving ${this.services.size} services`);
    
    // Simple message loop for testing
    process.stdin.on('data', async (data) => {
      try {
        const message = JSON.parse(data.toString().trim());
        let response;
        
        switch (message.method) {
          case 'resources/list':
            response = await this.handleListResources();
            break;
          case 'resources/read':
            response = await this.handleReadResource(message.params.uri);
            break;
          default:
            response = { error: `Unknown method: ${message.method}` };
        }
        
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: response
        }));
      } catch (error) {
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id: message?.id || null,
          error: { message: error.message }
        }));
      }
    });
  }
}

const server = new DealMateMCPServer();
server.run().catch(console.error);