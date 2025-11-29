import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configurações
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const CAPTURAS_DIR = path.join(DATA_DIR, 'capturas');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const API_LOGS_DIR = path.join(LOGS_DIR, 'api');

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar diretórios
async function initializeDirectories() {
  try {
    await fs.ensureDir(CAPTURAS_DIR);
    await fs.ensureDir(LOGS_DIR);
    await fs.ensureDir(API_LOGS_DIR);
    console.log('📁 Diretórios inicializados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao criar diretórios:', error);
    process.exit(1);
  }
}

// Estado global para armazenar dados dos Arduino Nanos
const getNanoData = {
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
const pendingRequests = new Map();

// WebSocket para comunicação com frontend
const wss = new WebSocketServer({ port: 8081 });

// Função para processar mensagens do frontend
function handleFrontendMessage(data) {
  console.log('📡 Recebido do frontend:', data);
  
  if (data.type === 'get_response') {
    const { 
      nano, 
      response, 
      timestamp, 
      requestId, 
      trigger_source = 'UNKNOWN',
      save_individual = true, // ✅ NOVO: default true
      sequence_data = null // ✅ NOVO
    } = data;
    
    if (nano === 'nano1' || nano === 'nano2') {
      // Atualizar estado do Nano
      getNanoData[nano] = {
        lastResponse: response,
        timestamp: timestamp,
        isConnected: true,
        lastCommand: 'GET'
      };
      
      // Processar requisição pendente com as novas flags
      if (requestId && pendingRequests.has(requestId)) {
        const { save_individual: pendingSaveIndividual } = pendingRequests.get(requestId);
        processPendingRequest(nano, response, timestamp, requestId, trigger_source);
      } else {
        // Se não é uma requisição pendente, só salva se for individual
        if (save_individual) {
          saveGetNanoLog(nano, response, timestamp, trigger_source, requestId);
        }
      }
    }
  }
  
  if (data.type === 'connection_status') {
    const { nano1Connected, nano2Connected } = data;
    getNanoData.nano1.isConnected = nano1Connected;
    getNanoData.nano2.isConnected = nano2Connected;
    
    console.log(`🔌 Status de conexão atualizado - Nano1: ${nano1Connected}, Nano2: ${nano2Connected}`);
  }
}

// Processar requisições pendentes
function processPendingRequest(nano, response, timestamp, requestId, triggerSource) {
  if (requestId && pendingRequests.has(requestId)) {
    const { res, timeout } = pendingRequests.get(requestId);
    clearTimeout(timeout);
    
    res.json({
      success: true,
      nano: nano,
      data: response,
      timestamp: timestamp,
      requestId: requestId,
      trigger_source: triggerSource
    });
    
    pendingRequests.delete(requestId);
    console.log(`✅ Requisição ${requestId} processada com sucesso`);
  }
}

// Função para salvar capturas organizadamente
async function saveOrganizedCapture(nano, response, timestamp, triggerSource, requestId) {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const capturasDateDir = path.join(CAPTURAS_DIR, date);
    await fs.ensureDir(capturasDateDir);
    
    const filename = `ir_${nano}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(capturasDateDir, filename);
    
    const captureData = {
      metadata: {
        nano: nano,
        timestamp: timestamp,
        request_id: requestId,
        trigger_source: triggerSource,
        saved_at: new Date().toISOString()
      },
      data: response
    };
    
    await fs.writeJson(filepath, captureData, { spaces: 2 });
    console.log(`💾 Captura salva organizadamente: ${filename}`);
    
    return filepath;
  } catch (error) {
    console.error('❌ Erro ao salvar captura organizada:', error);
    throw error;
  }
}

// Função para salvar logs
async function saveGetNanoLog(nano, response, timestamp, triggerSource = 'MANUAL', requestId = null) {
  try {
    const filename = `get_${nano}_${new Date().toISOString().slice(0, 10)}.json`;
    const filepath = path.join(API_LOGS_DIR, filename);
    
    let existingData = [];
    if (await fs.pathExists(filepath)) {
      existingData = await fs.readJson(filepath);
    }
    
    const logEntry = {
      timestamp: timestamp,
      nano: nano,
      response: response,
      trigger_source: triggerSource,
      request_id: requestId,
      source: 'api',
      logged_at: new Date().toISOString()
    };
    
    existingData.push(logEntry);
    await fs.writeJson(filepath, existingData, { spaces: 2 });
    
    // Salvar como captura organizada se for uma resposta completa
    if (response && typeof response === 'object' && Object.keys(response).length > 0) {
      await saveOrganizedCapture(nano, response, timestamp, triggerSource, requestId);
    }
    
    console.log(`💾 Log salvo: ${filename} - Source: ${triggerSource}`);
  } catch (error) {
    console.error('❌ Erro ao salvar log:', error);
  }
}

// Configuração WebSocket
wss.on('connection', (ws) => {
  console.log('🔌 Frontend conectado via WebSocket');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleFrontendMessage(data);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem WebSocket:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao processar mensagem',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Frontend desconectado');
  });
  
  ws.on('error', (error) => {
    console.error('❌ Erro WebSocket:', error);
  });
});

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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
        lastUpdate: getNanoData.nano1.timestamp,
        hasData: !!getNanoData.nano1.lastResponse
      },
      nano2: {
        connected: getNanoData.nano2.isConnected,
        lastResponse: getNanoData.nano2.lastResponse ? 'Dados disponíveis' : null,
        lastUpdate: getNanoData.nano2.timestamp,
        hasData: !!getNanoData.nano2.lastResponse
      }
    }
  });
});

// NOVO: Endpoint para captura consolidada
app.post('/get-nano-consolidado/:nano', async (req, res) => {
  const { nano } = req.params;
  const { 
    timeout = 10000, 
    payload, 
    trigger_source = 'API_CALL',
    sequence_data = null, // ✅ NOVO: dados da sequência
    save_individual = false // ✅ NOVO: controla se salva individualmente
  } = req.body;
  
  // Validação do parâmetro nano
  if (nano !== 'nano1' && nano !== 'nano2') {
    return res.status(400).json({
      success: false,
      error: 'Arduino Nano inválido. Use nano1 ou nano2',
      timestamp: new Date().toISOString()
    });
  }
  
  // Verificar se o Nano está conectado
  if (!getNanoData[nano].isConnected) {
    return res.status(503).json({
      success: false,
      error: `Arduino ${nano} não está conectado`,
      timestamp: new Date().toISOString()
    });
  }
  
  const requestId = uuidv4();
  
  // Configurar timeout
  const requestTimeout = setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      const { res: pendingRes } = pendingRequests.get(requestId);
      pendingRes.status(408).json({
        success: false,
        error: 'Timeout - Arduino não respondeu',
        requestId: requestId,
        timestamp: new Date().toISOString(),
        nano: nano
      });
      pendingRequests.delete(requestId);
      console.log(`⏰ Timeout na requisição ${requestId} para ${nano}`);
    }
  }, timeout);
  
  // Adicionar à fila de requisições pendentes
  pendingRequests.set(requestId, { 
    res, 
    timeout: requestTimeout,
    save_individual, // ✅ NOVO: passa a flag para o handler
    sequence_data // ✅ NOVO: passa dados da sequência
  });
  
  // Preparar mensagem para frontend
  const message = {
    type: 'execute_get',
    nano: nano,
    requestId: requestId,
    payload: payload,
    trigger_source: trigger_source,
    timestamp: new Date().toISOString(),
    save_individual: save_individual, // ✅ NOVO
    sequence_data: sequence_data // ✅ NOVO
  };
  
  // Enviar para todos os clientes WebSocket conectados
  let sentToClients = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
      sentToClients++;
    }
  });
  
  if (sentToClients === 0) {
    clearTimeout(requestTimeout);
    pendingRequests.delete(requestId);
    return res.status(503).json({
      success: false,
      error: 'Nenhum frontend conectado',
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`📡 Comando GET CONSOLIDADO enviado para ${nano} (Request ID: ${requestId}) - Individual: ${save_individual}`);
});

// Executar comando GET em Arduino Nano específico
app.post('/get-nano/:nano', async (req, res) => {
  const { nano } = req.params;
  const { timeout = 10000, payload, trigger_source = 'API_CALL' } = req.body;
  
  // Validação do parâmetro nano
  if (nano !== 'nano1' && nano !== 'nano2') {
    return res.status(400).json({
      success: false,
      error: 'Arduino Nano inválido. Use nano1 ou nano2',
      timestamp: new Date().toISOString()
    });
  }
  
  // Verificar se o Nano está conectado
  if (!getNanoData[nano].isConnected) {
    return res.status(503).json({
      success: false,
      error: `Arduino ${nano} não está conectado`,
      timestamp: new Date().toISOString()
    });
  }
  
  const requestId = uuidv4();
  
  // Configurar timeout
  const requestTimeout = setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      const { res: pendingRes } = pendingRequests.get(requestId);
      pendingRes.status(408).json({
        success: false,
        error: 'Timeout - Arduino não respondeu',
        requestId: requestId,
        timestamp: new Date().toISOString(),
        nano: nano
      });
      pendingRequests.delete(requestId);
      console.log(`⏰ Timeout na requisição ${requestId} para ${nano}`);
    }
  }, timeout);
  
  // Adicionar à fila de requisições pendentes
  pendingRequests.set(requestId, { res, timeout: requestTimeout });
  
  // Preparar mensagem para frontend
  const message = {
    type: 'execute_get',
    nano: nano,
    requestId: requestId,
    payload: payload,
    trigger_source: trigger_source,
    timestamp: new Date().toISOString()
  };
  
  // Enviar para todos os clientes WebSocket conectados
  let sentToClients = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
      sentToClients++;
    }
  });
  
  if (sentToClients === 0) {
    clearTimeout(requestTimeout);
    pendingRequests.delete(requestId);
    return res.status(503).json({
      success: false,
      error: 'Nenhum frontend conectado',
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`📡 Comando GET enviado para ${nano} (Request ID: ${requestId}) - Source: ${trigger_source} - Clientes: ${sentToClients}`);
});

// Última resposta do Arduino Nano
app.get('/get-nano/:nano/last', (req, res) => {
  const { nano } = req.params;
  
  if (nano !== 'nano1' && nano !== 'nano2') {
    return res.status(400).json({
      success: false,
      error: 'Arduino Nano inválido. Use nano1 ou nano2',
      timestamp: new Date().toISOString()
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
    lastCommand: nanoData.lastCommand,
    isConnected: nanoData.isConnected
  });
});

// Listar logs disponíveis
app.get('/logs', async (req, res) => {
  try {
    if (!await fs.pathExists(API_LOGS_DIR)) {
      return res.json({
        success: true,
        logs: [],
        message: 'Nenhum log encontrado'
      });
    }
    
    const files = await fs.readdir(API_LOGS_DIR);
    const logFiles = files.filter(file => file.endsWith('.json'));
    
    const logsInfo = await Promise.all(
      logFiles.map(async (file) => {
        try {
          const filepath = path.join(API_LOGS_DIR, file);
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
        } catch (error) {
          console.error(`Erro ao processar arquivo ${file}:`, error);
          return null;
        }
      })
    );
    
    const validLogs = logsInfo.filter(log => log !== null);
    
    res.json({
      success: true,
      logs: validLogs,
      total: validLogs.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar logs:', error);
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
    
    // Prevenir path traversal
    if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        error: 'Nome de arquivo inválido'
      });
    }
    
    const filepath = path.join(API_LOGS_DIR, filename);
    
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
    console.error('❌ Erro ao ler log:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao ler log: ' + error.message
    });
  }
});

// CORREÇÃO: Rota 404 - Removendo o padrão problemático
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
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

// Inicialização do servidor
async function startServer() {
  try {
    await initializeDirectories();
    
    app.listen(PORT, () => {
      console.log(`🚀 API Hardware Controller rodando em http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server rodando em ws://localhost:8081`);
      console.log(`📡 Pronto para receber comandos GET Nano`);
      console.log(`💾 Dados salvos em: ${DATA_DIR}`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function setupGracefulShutdown() {
  const shutdown = (signal) => {
    console.log(`\n🛑 Recebido ${signal}. Encerrando servidor...`);
    
    // Fechar WebSocket
    wss.close(() => {
      console.log('🔌 WebSocket server fechado');
    });
    
    // Limpar timeouts pendentes
    pendingRequests.forEach(({ timeout }, requestId) => {
      clearTimeout(timeout);
      console.log(`🧹 Limpando timeout da requisição ${requestId}`);
    });
    
    setTimeout(() => {
      console.log('👋 Servidor encerrado');
      process.exit(0);
    }, 1000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Iniciar aplicação
startServer();
setupGracefulShutdown();