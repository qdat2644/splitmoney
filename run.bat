@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "C:\Users\Admin\Desktop\abcxyz\c"
echo Node version:
node --version
echo npm version:
npm --version
echo.
echo Running npm install...
npm install
echo.
echo Done! Starting dev server...
npm run dev
