@echo off
setlocal

REM Check if MCP_RUNTIME is set, default to auto
if "%MCP_RUNTIME%"=="" set MCP_RUNTIME=auto

echo Starting DealMate MCP Server...

REM Try Node.js launcher first
where node >nul 2>&1
if %errorlevel%==0 (
    node start-server.js
    goto :end
)

REM Fallback to Python launcher
where python >nul 2>&1
if %errorlevel%==0 (
    python start-server.py
    goto :end
)

where python3 >nul 2>&1
if %errorlevel%==0 (
    python3 start-server.py
    goto :end
)

echo Error: Neither Node.js nor Python found
echo Please install Node.js or Python to run the server
exit /b 1

:end