@echo off
cd /d "C:\dev\pm-tool"
set "PATH=C:\Users\makot\AppData\Local\nodejs-portable\node-v22.18.0-win-x64;%PATH%"
call npm run dev
