@echo off
title Delícias da Rita - Sistema de Comandas & Servidor Remoto
chcp 65001 > nul
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ========================================================
echo    DELÍCIAS DA RITA - SISTEMA DE COMANDAS REMOTO
echo ========================================================
echo.
echo Verificando arquivos de producao...

if not exist "dist\index.html" (
    echo Compilando sistema pela primeira vez...
    call npm.cmd run build
)

echo.
echo Iniciando Servidor e gerando link do Cloudflare...
echo.

node start-tunnel.js

pause
