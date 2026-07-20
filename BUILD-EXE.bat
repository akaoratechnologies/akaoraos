@echo off
title Akaora OS v2 EXE Builder
echo Installing dependencies...
npm install
echo Building Windows installer...
npm run build
echo Done. Check the dist folder.
pause
