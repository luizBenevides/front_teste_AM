// server.js
const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Estado das portas
let serialPorts = new Map();
let getNanoLogs = [];

// Configuração das portas (ajuste conforme suas portas)
const PORT_CONFIG = {
  'nano1': { path: 'COM3', baudRate: 115200 }, // Windows
  'nano2': { path: 'COM4', baudRate: 115200 }  // Windows
  // Para Linux: '/dev/ttyUSB0', '/dev/ttyUSB1'
  // Para Mac: '/dev/tty.usbserial-*'
};

// Função para conectar à porta serial
async function connectToPort(portKey) {
  try {
    const config = PORT_CONFIG[portKey];
    if (!config) {
      throw new Error(`Configuração não encontrada para ${portKey}`);
    }

    const port = new SerialPort({ 
      path: config.path, 
      baudRate: config.baudRate 
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
      console.log(`✅ ${portKey} conectado em ${config.path}`);
      serialPorts.set(portKey, { port, parser, isConnected: true });
      
      // Reset do Arduino após conexão
      resetArduino(port);
    });

    parser.on('data', (data) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        port: portKey,
        type: 'receive',
        data: data.trim()
      };
      
      getNanoLogs.push(logEntry);
      console.log(`📡 ← ${portKey}: ${data.trim()}`);
    });

    port.on('error', (err) => {
      console.error(`❌ Erro ${portKey}:`, err.message);
      serialPorts.delete(portKey);
    });

    port.on('close', () => {
      console.log(`📡 ${portKey} desconectado`);
      serialPorts.delete(portKey);
    });

    return true;
  } catch (error) {
    console.error(`❌ Erro ao conectar ${portKey}:`, error.message);
    return false;
  }
}

// Função para resetar Arduino
function resetArduino(port) {
  port.set({ dtr: false }, () => {
    setTimeout(() => {
      port.set({ dtr: true });
    }, 100);
  });
}

// Rota para executar GET Nano
app.post('/GET', async (req, res) => {
  try {
    const { port = 'nano1' } = req.body;
    
    if (!serialPorts.has(port)) {
      // Tentar conectar se não estiver conectado
      const connected = await connectToPort(port);
      if (!connected) {
        return res.status(400).json({ 
          error: `Porta ${port} não disponível` 
        });
      }
      
      // Aguardar estabilização
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const portData = serialPorts.get(port);
    if (!portData || !portData.isConnected) {
      return res.status(400).json({ 
        error: `Porta ${port} não conectada` 
      });
    }

    // Enviar comando GET
    portData.port.write('GET\n');
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      port,
      type: 'send',
      data: 'GET'
    };
    getNanoLogs.push(logEntry);

    // Aguardar resposta (timeout de 5 segundos)
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando resposta'));
      }, 5000);

      const responseHandler = (data) => {
        const responseData = data.trim();
        if (responseData && !responseData.includes('CMD:')) {
          clearTimeout(timeout);
          portData.parser.removeListener('data', responseHandler);
          resolve(responseData);
        }
      };

      portData.parser.on('data', responseHandler);
    });

    // Coletar logs relevantes
    const relevantLogs = getNanoLogs
      .filter(log => 
        log.timestamp >= timestamp && 
        (log.type === 'send' || log.type === 'receive')
      )
      .slice(-10); // Últimos 10 logs

    res.json({
      success: true,
      port,
      command: 'GET',
      response: response,
      timestamp: new Date().toISOString(),
      logs: relevantLogs
    });

  } catch (error) {
    console.error('❌ Erro no GET:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
});

// Rota para status das portas
app.get('/status', (req, res) => {
  const status = {};
  
  for (const [portKey, portData] of serialPorts.entries()) {
    status[portKey] = {
      connected: portData.isConnected,
      path: PORT_CONFIG[portKey]?.path
    };
  }

  res.json({
    ports: status,
    availablePorts: Object.keys(PORT_CONFIG)
  });
});

// Rota para conectar porta específica
app.post('/connect/:port', async (req, res) => {
  const { port } = req.params;
  
  if (!PORT_CONFIG[port]) {
    return res.status(400).json({ 
      error: `Porta ${port} não configurada` 
    });
  }

  const connected = await connectToPort(port);
  
  if (connected) {
    res.json({ 
      success: true, 
      message: `Porta ${port} conectada` 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      error: `Falha ao conectar ${port}` 
    });
  }
});

// Rota para desconectar
app.post('/disconnect/:port', (req, res) => {
  const { port } = req.params;
  const portData = serialPorts.get(port);
  
  if (portData) {
    portData.port.close();
    serialPorts.delete(port);
    res.json({ success: true, message: `Porta ${port} desconectada` });
  } else {
    res.status(400).json({ error: `Porta ${port} não está conectada` });
  }
});

// Rota para obter logs
app.get('/logs', (req, res) => {
  const { limit = 50, port } = req.query;
  let logs = getNanoLogs;

  if (port) {
    logs = logs.filter(log => log.port === port);
  }

  logs = logs.slice(-limit);
  res.json({ logs });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Node.js rodando na porta ${PORT}`);
  console.log('📡 Endpoints disponíveis:');
  console.log('  POST /GET          - Executar comando GET no Nano');
  console.log('  GET  /status       - Status das portas');
  console.log('  POST /connect/:port- Conectar porta específica');
  console.log('  POST /disconnect/:port - Desconectar porta');
  console.log('  GET  /logs         - Obter logs');
});

// Conectar automaticamente às portas configuradas
async function initializePorts() {
  for (const portKey of Object.keys(PORT_CONFIG)) {
    console.log(`🔌 Tentando conectar ${portKey}...`);
    await connectToPort(portKey);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Inicializar ao iniciar o servidor
initializePorts();