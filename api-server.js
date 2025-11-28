import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Para obter __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Estado global para armazenar dados dos Arduino Nanos
let getNanoData = {
  nano1: {
    lastResponse: null,
    timestamp: null,
    isConnected: false,
    lastCommand: null
  },
  nano2: {
    lastResponse: null, 
    timestamp: null,
    isConnected: false,
    lastCommand: null
  }
};

// Fila de requisições pendentes
let pendingRequests = new Map();

// WebSocket para comunicação com frontend
const wss = new WebSocketServer({ port: 8081 });

wss.on('connection', (ws) => {
  console.log('🔌 Frontend conectado via WebSocket');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleFrontendMessage(data);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem WebSocket:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Frontend desconectado');
  });
});

// Função para processar mensagens do frontend
function handleFrontendMessage(data) {
  console.log('📡 Recebido do frontend:', data);
  
  if (data.type === 'get_response') {
    // Resposta do GET Nano recebida do frontend
    const { nano, response, timestamp, requestId } = data;
    
    if (nano === 'nano1' || nano === 'nano2') {
      getNanoData[nano] = {
        lastResponse: response,
        timestamp: timestamp,
        isConnected: true,
        lastCommand: 'GET'
      };
      
      // Se há requisição pendente, responder
      if (requestId && pendingRequests.has(requestId)) {
        const { res } = pendingRequests.get(requestId);
        res.json({
          success: true,
          nano: nano,
          data: response,
          timestamp: timestamp,
          requestId: requestId
        });
        pendingRequests.delete(requestId);
      }
      
      // Salvar em arquivo se necessário
      saveGetNanoLog(nano, response, timestamp);
    }
  }
  
  if (data.type === 'connection_status') {
    // Status de conexão dos Arduino Nanos
    const { nano1Connected, nano2Connected } = data;
    getNanoData.nano1.isConnected = nano1Connected;
    getNanoData.nano2.isConnected = nano2Connected;
  }
}

// Função para salvar logs
async function saveGetNanoLog(nano, response, timestamp) {
  try {
    const logsDir = path.join(__dirname, 'logs', 'api');
    await fs.ensureDir(logsDir);
    
    const filename = `get_${nano}_${new Date().toISOString().slice(0, 10)}.json`;
    const filepath = path.join(logsDir, filename);
    
    let existingData = [];
    if (await fs.pathExists(filepath)) {
      existingData = await fs.readJson(filepath);
    }
    
    existingData.push({
      timestamp: timestamp,
      nano: nano,
      response: response,
      source: 'api'
    });
    
    await fs.writeJson(filepath, existingData, { spaces: 2 });
    console.log(`💾 Log salvo: ${filename}`);
  } catch (error) {
    console.error('❌ Erro ao salvar log:', error);
  }
}

// ==================== ROTAS DA API ====================

// Rota principal - informações da API
app.get('/', (req, res) => {
  res.json({
    name: 'Hardware Controller API',
    version: '1.0.0',
    description: 'API para integração com sistema GET Nano',
    endpoints: {
      'GET /status': 'Status dos Arduino Nanos',
      'POST /get-nano/:nano': 'Executar comando GET em Arduino Nano específico',
      'GET /get-nano/:nano/last': 'Última resposta do Arduino Nano',
      'GET /logs': 'Listar logs disponíveis',
      'GET /logs/:filename': 'Baixar log específico'
    },
    websocket: 'ws://localhost:8081'
  });
});

// Status dos Arduino Nanos
app.get('/status', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    nanos: {
      nano1: {
        connected: getNanoData.nano1.isConnected,
        lastResponse: getNanoData.nano1.lastResponse ? 'Dados disponíveis' : null,
        lastUpdate: getNanoData.nano1.timestamp
      },
      nano2: {
        connected: getNanoData.nano2.isConnected,
        lastResponse: getNanoData.nano2.lastResponse ? 'Dados disponíveis' : null,
        lastUpdate: getNanoData.nano2.timestamp
      }
    }
  });
});

// Executar comando GET em Arduino Nano específico
app.post('/get-nano/:nano', async (req, res) => {
  const { nano } = req.params;
  const { timeout = 10000, payload } = req.body;
  
  if (nano !== 'nano1' && nano !== 'nano2') {
    return res.status(400).json({
      success: false,
      error: 'Arduino Nano inválido. Use nano1 ou nano2',
      timestamp: new Date().toISOString()
    });
  }
  
  if (!getNanoData[nano].isConnected) {
    return res.status(503).json({
      success: false,
      error: `Arduino ${nano} não está conectado`,
      timestamp: new Date().toISOString()
    });
  }
  
  const requestId = uuidv4();
  
  // Adicionar à fila de requisições pendentes
  const requestTimeout = setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      const { res: pendingRes } = pendingRequests.get(requestId);
      pendingRes.status(408).json({
        success: false,
        error: 'Timeout - Arduino não respondeu',
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      pendingRequests.delete(requestId);
    }
  }, timeout);
  
  pendingRequests.set(requestId, { res, timeout: requestTimeout });
  
  // Enviar comando para frontend via WebSocket
  const message = {
    type: 'execute_get',
    nano: nano,
    requestId: requestId,
    payload: payload,
    timestamp: new Date().toISOString()
  };
  
  // Broadcast para todos os clientes WebSocket conectados
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(JSON.stringify(message));
    }
  });
  
  console.log(`📡 Comando GET enviado para ${nano} (Request ID: ${requestId})`);
});

// Última resposta do Arduino Nano
app.get('/get-nano/:nano/last', (req, res) => {
  const { nano } = req.params;
  
  if (nano !== 'nano1' && nano !== 'nano2') {
    return res.status(400).json({
      success: false,
      error: 'Arduino Nano inválido. Use nano1 ou nano2'
    });
  }
  
  const nanoData = getNanoData[nano];
  
  if (!nanoData.lastResponse) {
    return res.status(404).json({
      success: false,
      error: 'Nenhuma resposta disponível para este Arduino Nano',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    nano: nano,
    data: nanoData.lastResponse,
    timestamp: nanoData.timestamp,
    lastCommand: nanoData.lastCommand
  });
});

// Listar logs disponíveis
app.get('/logs', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, 'logs', 'api');
    
    if (!await fs.pathExists(logsDir)) {
      return res.json({
        success: true,
        logs: [],
        message: 'Nenhum log encontrado'
      });
    }
    
    const files = await fs.readdir(logsDir);
    const logFiles = files.filter(file => file.endsWith('.json'));
    
    const logsInfo = await Promise.all(
      logFiles.map(async (file) => {
        const filepath = path.join(logsDir, file);
        const stats = await fs.stat(filepath);
        const data = await fs.readJson(filepath);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          entries: data.length,
          downloadUrl: `/logs/${file}`
        };
      })
    );
    
    res.json({
      success: true,
      logs: logsInfo,
      total: logFiles.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao listar logs: ' + error.message
    });
  }
});

// Baixar log específico
app.get('/logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename.endsWith('.json')) {
      return res.status(400).json({
        success: false,
        error: 'Apenas arquivos JSON são permitidos'
      });
    }
    
    const filepath = path.join(__dirname, 'logs', 'api', filename);
    
    if (!await fs.pathExists(filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo de log não encontrado'
      });
    }
    
    const data = await fs.readJson(filepath);
    res.json({
      success: true,
      filename: filename,
      data: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao ler log: ' + error.message
    });
  }
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('❌ Erro na API:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 API Hardware Controller rodando em http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server rodando em ws://localhost:8081`);
  console.log(`📡 Pronto para receber comandos GET Nano`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Encerrando servidor API...');
  wss.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Encerrando servidor API...');
  wss.close();
  process.exit(0);
});