#!/bin/bash

# Script para mover logs JSON da pasta Downloads para logs/
# Uso: ./move_logs.sh

LOGS_DIR="/home/elgin/front_teste_AM/logs"
DOWNLOADS_DIR="/home/elgin/Downloads"

echo "🔍 Procurando arquivos de log na pasta Downloads..."

# Procurar arquivos get_nano_logs_*.json
nano_files=$(find "$DOWNLOADS_DIR" -name "get_nano_logs_*.json" -type f 2>/dev/null)

if [ -z "$nano_files" ]; then
    echo "❌ Nenhum arquivo get_nano_logs_*.json encontrado em $DOWNLOADS_DIR"
else
    echo "📦 Arquivos encontrados:"
    echo "$nano_files"
    
    echo ""
    echo "📁 Movendo para $LOGS_DIR..."
    
    for file in $nano_files; do
        filename=$(basename "$file")
        mv "$file" "$LOGS_DIR/"
        echo "✅ Movido: $filename"
    done
    
    echo ""
    echo "🎉 Concluído! Arquivos agora estão em:"
    ls -la "$LOGS_DIR"/*.json 2>/dev/null | tail -5
fi

# Procurar outros arquivos de log relacionados
other_files=$(find "$DOWNLOADS_DIR" -name "*logs_*.json" -o -name "*responses_*.json" -type f 2>/dev/null)

if [ ! -z "$other_files" ]; then
    echo ""
    echo "💡 Outros arquivos de log encontrados:"
    echo "$other_files"
    echo ""
    read -p "Deseja mover estes arquivos também? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for file in $other_files; do
            filename=$(basename "$file")
            mv "$file" "$LOGS_DIR/"
            echo "✅ Movido: $filename"
        done
    fi
fi

echo ""
echo "✨ Script concluído!"