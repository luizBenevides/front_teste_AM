#!/bin/bash

echo "🚀 Sistema AUTO GET Nano - Instalação e Uso"
echo "=============================================="

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor instale Node.js primeiro."
    exit 1
fi

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 não encontrado. Por favor instale Python3 primeiro."
    exit 1
fi

echo "✅ Node.js e Python3 encontrados"

# Instalar dependências Node.js para API
echo ""
echo "📦 Instalando dependências da API..."
cd /home/elgin/front_teste_AM

npm install express cors ws uuid fs-extra axios multer

echo "✅ Dependências da API instaladas"

# Instalar dependências Python
echo ""
echo "🐍 Instalando dependências Python..."
pip3 install requests flask 2>/dev/null || {
    echo "⚠️ Tentando com --user..."
    pip3 install --user requests flask
}

echo "✅ Dependências Python instaladas"

echo ""
echo "🎯 COMO USAR O SISTEMA AUTO GET NANO:"
echo "====================================="

echo ""
echo "1️⃣ INICIAR API (Terminal 1):"
echo "   cd /home/elgin/front_teste_AM"
echo "   node api-server.js"
echo "   → API rodará em http://localhost:3001"

echo ""
echo "2️⃣ ABRIR INTERFACE IR (Browser):"
echo "   → Abrir http://localhost:3000/ir.html"
echo "   → Conectar Arduino Nano 1 e Nano 2"
echo "   → Interface se conectará automaticamente à API"

echo ""
echo "3️⃣ USAR TRIGGER AUTOMÁTICO (Terminal 2):"
echo ""
echo "   🧪 Teste único:"
echo "   python3 auto_trigger.py test"
echo ""
echo "   ⏰ Auto-trigger contínuo (a cada 60s):"
echo "   python3 auto_trigger.py auto"
echo ""
echo "   🌐 Servidor web trigger (porta 5000):"
echo "   python3 auto_trigger.py server"

echo ""
echo "4️⃣ EXEMPLOS DE CHAMADAS HTTP:"
echo ""
echo "   📡 Acionar GET Nano 1:"
echo "   curl -X POST http://localhost:5000/trigger/nano1"
echo ""
echo "   📡 Acionar GET Nano 2:"
echo "   curl -X POST http://localhost:5000/trigger/nano2"
echo ""
echo "   📡 Acionar ambos:"
echo "   curl -X POST http://localhost:5000/trigger/both"

echo ""
echo "✨ SISTEMA PRONTO PARA USO!"

chmod +x /home/elgin/front_teste_AM/auto_trigger.py
chmod +x /home/elgin/front_teste_AM/get_nano_client.py

echo ""
echo "🔧 Permissões de execução definidas"
echo "🚀 Sistema AUTO GET Nano está pronto!"