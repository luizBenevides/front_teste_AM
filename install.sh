#!/bin/bash

# Script para instalar e rodar Hardware Controller no Linux
# Uso: bash install.sh

set -e

echo "🚀 Instalando Hardware Controller..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Node.js não encontrado. Instalando..."
    
    # Detectar distribuição Linux
    if command -v apt &> /dev/null; then
        # Ubuntu/Debian
        echo "🔧 Detectado Ubuntu/Debian"
        sudo apt update
        sudo apt install -y nodejs npm
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Fedora
        echo "🔧 Detectado CentOS/RHEL/Fedora"
        sudo yum install -y nodejs npm
    elif command -v dnf &> /dev/null; then
        # Fedora (dnf)
        echo "🔧 Detectado Fedora (dnf)"
        sudo dnf install -y nodejs npm
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        echo "🔧 Detectado Arch Linux"
        sudo pacman -S --noconfirm nodejs npm
    else
        echo "❌ Distribuição Linux não suportada automaticamente."
        echo "📝 Por favor, instale Node.js manualmente:"
        echo "   https://nodejs.org/en/download/"
        exit 1
    fi
else
    echo "✅ Node.js já está instalado: $(node --version)"
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build do projeto
echo "🔨 Construindo projeto..."
npm run build

# Iniciar servidor
echo "🌐 Iniciando servidor..."
echo "📍 Acesse: http://localhost:3000"
echo "🔧 Para parar: Ctrl+C"
echo ""

npm start