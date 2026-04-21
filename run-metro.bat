@echo off
set NODE_OPTIONS=--max-old-space-size=8192
cd /d "%~dp0apps\mobile"
npx expo start --dev-client > "%~dp0metro.log" 2> "%~dp0metro-err.log"
