@echo off
set NODE_OPTIONS=--max-old-space-size=8192
cd /d C:\Users\spere\matchday-social-app\apps\mobile
npx expo start --dev-client > C:\Users\spere\matchday-social-app\metro.log 2> C:\Users\spere\matchday-social-app\metro-err.log
