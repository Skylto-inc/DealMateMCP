#!/usr/bin/env python3

import os
import json
import sys
from pathlib import Path
from typing import Dict, List, Any

# Load environment variables
MCP_CONTEXT_PATH = os.getenv('MCP_CONTEXT_PATH', './context-index')

class DealMateMCPServer:
    def __init__(self):
        self.services = {}
        self.context_path = Path(MCP_CONTEXT_PATH)
    
    def load_services(self):
        """Load all DealMate services and their files"""
        if not self.context_path.exists():
            print(f"Error: Context path {self.context_path} does not exist", file=sys.stderr)
            return
        
        for service_dir in self.context_path.iterdir():
            if service_dir.is_dir() and not service_dir.name.startswith('.'):
                files = self.get_service_files(service_dir)
                self.services[service_dir.name] = files
        
        print(f"Loaded {len(self.services)} services with context", file=sys.stderr)
    
    def get_service_files(self, service_path: Path) -> List[Dict[str, str]]:
        """Get all relevant files from a service directory"""
        files = []
        
        def scan_directory(dir_path: Path, relative_path: str = ""):
            try:
                for item in dir_path.iterdir():
                    if item.is_dir() and not item.name.startswith('.') and \
                       item.name not in ['target', 'node_modules', '__pycache__']:
                        scan_directory(item, f"{relative_path}{item.name}/")
                    elif item.is_file() and self.is_relevant_file(item.name):
                        files.append({
                            'name': item.name,
                            'path': f"{relative_path}{item.name}",
                            'full_path': str(item),
                            'service': service_path.name
                        })
            except PermissionError:
                pass
        
        scan_directory(service_path)
        return files
    
    def is_relevant_file(self, filename: str) -> bool:
        """Check if file is relevant for context"""
        relevant_extensions = ['.rs', '.py', '.js', '.ts', '.json', '.toml', '.yml', '.yaml']
        relevant_files = ['Dockerfile', 'README.md', 'Cargo.toml', 'package.json', 'requirements.txt']
        
        return (any(filename.endswith(ext) for ext in relevant_extensions) or 
                filename in relevant_files)
    
    def get_file_content(self, file_path: str) -> str:
        """Read file content"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Cannot read file: {e}")
    
    def get_mime_type(self, filename: str) -> str:
        """Get MIME type for file"""
        if filename.endswith('.rs'): return 'text/x-rust'
        if filename.endswith('.py'): return 'text/x-python'
        if filename.endswith('.js'): return 'text/javascript'
        if filename.endswith('.ts'): return 'text/typescript'
        if filename.endswith('.json'): return 'application/json'
        if filename.endswith('.md'): return 'text/markdown'
        if filename.endswith('.toml'): return 'text/x-toml'
        if filename.endswith(('.yml', '.yaml')): return 'text/yaml'
        return 'text/plain'
    
    def handle_list_resources(self) -> Dict[str, Any]:
        """Handle MCP resources/list request"""
        resources = []
        
        for service_name, files in self.services.items():
            for file_info in files:
                resources.append({
                    'uri': f"dealmate://{service_name}/{file_info['path']}",
                    'name': f"{service_name}/{file_info['path']}",
                    'description': f"{service_name} - {file_info['name']}",
                    'mimeType': self.get_mime_type(file_info['name'])
                })
        
        return {'resources': resources}
    
    def handle_read_resource(self, uri: str) -> Dict[str, Any]:
        """Handle MCP resources/read request"""
        if not uri.startswith('dealmate://'):
            raise Exception('Invalid URI scheme')
        
        resource_path = uri.replace('dealmate://', '')
        parts = resource_path.split('/', 1)
        
        if len(parts) != 2:
            raise Exception('Invalid resource path')
        
        service_name, file_path = parts
        
        if service_name not in self.services:
            raise Exception(f'Service not found: {service_name}')
        
        file_info = next((f for f in self.services[service_name] if f['path'] == file_path), None)
        if not file_info:
            raise Exception(f'File not found: {file_path}')
        
        content = self.get_file_content(file_info['full_path'])
        
        return {
            'contents': [{
                'uri': uri,
                'mimeType': self.get_mime_type(file_info['name']),
                'text': content
            }]
        }
    
    def run(self):
        """Run the MCP server"""
        self.load_services()
        
        print("DealMate MCP Server started", file=sys.stderr)
        print(f"Serving {len(self.services)} services", file=sys.stderr)
        
        # Simple STDIO MCP implementation
        for line in sys.stdin:
            try:
                message = json.loads(line.strip())
                response = None
                
                if message.get('method') == 'resources/list':
                    response = self.handle_list_resources()
                elif message.get('method') == 'resources/read':
                    response = self.handle_read_resource(message['params']['uri'])
                else:
                    response = {'error': f"Unknown method: {message.get('method')}"}
                
                result = {
                    'jsonrpc': '2.0',
                    'id': message.get('id'),
                    'result': response
                }
                print(json.dumps(result))
                
            except Exception as e:
                error_response = {
                    'jsonrpc': '2.0',
                    'id': message.get('id') if 'message' in locals() else None,
                    'error': {'message': str(e)}
                }
                print(json.dumps(error_response))

if __name__ == '__main__':
    server = DealMateMCPServer()
    server.run()