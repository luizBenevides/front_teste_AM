# 🚀 Sistema AUTO GET Nano - Guia Completo

## 📋 O que foi implementado:

### 🎯 **Sistema Principal:**
- ✅ Interface de controle de hardware (http://localhost:3000)
- ✅ Interface IR para Arduino Nanos (http://localhost:3000/ir.html)
- ✅ Salvamento automático de logs GET Nano
- ✅ 13 controles manuais + rotinas automáticas

### 🔗 **API de Integração:**
- ✅ **API Node.js** (`api-server.js`) - Ponte entre frontend e serviços externos
- ✅ **WebSocket** - Comunicação em tempo real
- ✅ **REST API** - Endpoints para outros serviços consumirem
- ✅ **Logs automáticos** - Salvamento em JSON

### 🤖 **Sistema de Trigger Automático:**
- ✅ **Cliente Python** (`get_nano_client.py`) - Acesso direto à API
- ✅ **Auto Trigger** (`auto_trigger.py`) - Sistema de acionamento automático
- ✅ **Servidor Web** - Endpoints HTTP para integração

## 🚀 Como usar:

### 1️⃣ **Iniciar Sistema Básico:**
```bash
# Terminal 1 - Interface principal
cd /home/elgin/front_teste_AM
npm start
# → http://localhost:3000 (interface principal)
# → http://localhost:3000/ir.html (interface IR)
```

### 2️⃣ **Iniciar API para Integração:**
```bash
# Terminal 2 - API de integração
cd /home/elgin/front_teste_AM
node api-server.js
# → API rodando em http://localhost:3001
# → WebSocket em ws://localhost:8080
```

### 3️⃣ **Conectar Arduino Nanos:**
- Abra http://localhost:3000/ir.html
- Clique "🔌 Conectar Nano 1" e selecione a porta
- Clique "🔌 Conectar Nano 2" e selecione a porta
- Ambos serão resetados automaticamente

### 4️⃣ **Testar Sistema Auto GET:**
```bash
# Terminal 3 - Teste único
python3 auto_trigger.py test

# OU - Auto-trigger contínuo
python3 auto_trigger.py auto

# OU - Servidor web trigger
python3 auto_trigger.py server
```

## 🔧 Exemplos de Integração:

### **Via HTTP (curl):**
```bash
# Acionar GET Nano 1
curl -X POST http://localhost:5000/trigger/nano1

# Acionar GET Nano 2  
curl -X POST http://localhost:5000/trigger/nano2

# Acionar ambos
curl -X POST http://localhost:5000/trigger/both

# Ver status
curl http://localhost:5000/status
```

### **Via Python direto:**
```python
import requests

# Acionar GET Nano
response = requests.post('http://localhost:3001/get-nano/nano1', 
                        json={'timeout': 10000})

if response.status_code == 200:
    data = response.json()
    print(f"Dados: {data['data']}")
```

### **Cliente Python completo:**
```bash
# Exemplo de uso
python3 get_nano_client.py

# Monitoramento contínuo
python3 get_nano_client.py monitor
```

## 📁 Estrutura de Arquivos:

```
/home/elgin/front_teste_AM/
├── index.html              # Interface principal
├── ir.html                 # Interface IR (Arduino Nanos)
├── api-server.js           # API de integração (Node.js)
├── auto_trigger.py         # Sistema de trigger automático
├── get_nano_client.py      # Cliente Python para API
├── setup_auto_trigger.sh   # Script de configuração
├── move_logs.sh           # Script para mover logs
├── logs/                  # Pasta de logs
│   ├── api/              # Logs da API
│   └── *.json            # Logs GET Nano
└── src/
    ├── app.component.js   # Componente principal
    └── services/
        └── serial.service.js  # Serviço serial
```

## 🎯 Fluxo Completo:

1. **Serviço externo** → POST `/trigger/nano1`
2. **API Node.js** → WebSocket para frontend IR
3. **Frontend IR** → Executa GET no Arduino Nano
4. **Arduino Nano** → Responde com dados IR
5. **Frontend IR** → WebSocket de volta para API
6. **API Node.js** → Retorna dados para serviço
7. **Sistema** → Salva logs automaticamente

## 💡 Casos de Uso:

### **Monitoramento Automático:**
- Sistema roda `auto_trigger.py auto` em background
- Executa GET nos Nanos a cada X segundos
- Logs salvos automaticamente

### **Integração com Sistemas:**
- ERP/Sistema principal chama API HTTP
- Recebe dados IR dos Arduino Nanos
- Processa dados conforme necessário

### **Desenvolvimento/Debug:**
- Interface IR para testes manuais
- Logs automáticos para análise
- API para automação de testes

## 🛡️ Segurança e Logs:

- ✅ Todos os comandos GET são logados
- ✅ Timestamps precisos em todos os logs
- ✅ Logs organizados por data/nano
- ✅ API protegida contra timeouts
- ✅ Reconexão automática WebSocket

## 🚀 Pronto para Produção:

O sistema está completamente funcional e pronto para:
- ✅ Integração com outros serviços
- ✅ Automação de processos
- ✅ Monitoramento contínuo
- ✅ Coleta de dados IR
- ✅ Análise de logs