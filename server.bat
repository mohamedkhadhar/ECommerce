@echo off
title MCP Stack with Concurrently

echo ==========================================
echo Lancement via CONCURRENTLY...
echo ==========================================

:: On utilise npx pour lancer concurrently sans avoir a l'installer en global
npx concurrently ^
  --names "API,MCP-SRV,INSPECT,AGENT" ^
  --prefix-colors "blue,green,magenta,cyan" ^
  "nodemon app.js" ^
  "nodemon server.js" ^
  "npx @modelcontextprotocol/inspector node server.js" ^