import { Injectable, signal } from '@angular/core';

export class LogMessage {
  constructor(timestamp, message, type) {
    this.timestamp = timestamp;
    this.message = message;
    this.type = type;
  }
}

export class SerialService {
  constructor() {
    // Dicionário para armazenar múltiplas conexões como no Python
    this.serialPorts = new Map();
    this.availablePorts = signal([]);
    this.selectedPorts = signal({ port1: '', port2: '' });
    this.connectedPorts = signal([]);
    
    this.isReading = false;
    
    this.isConnected = signal(false);
    this.logMessages = signal([]);
    this.isSupported = signal('serial' in navigator);
    
    if (!this.isSupported()) {
      this.addLogMessage('Web Serial API not supported by this browser.', 'error');
    }
  }

  addLogMessage(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    this.logMessages.update(logs => [...logs, { timestamp, message, type }]);
  }

  async refreshPorts() {
    if (!this.isSupported()) return [];
    
    try {
      // Note: Web Serial API não permite enumerar portas automaticamente
      // O usuário precisa selecionar manualmente via requestPort()
      // Vamos retornar as portas já autorizadas/conectadas
      const connectedPortNames = Array.from(this.serialPorts.keys());
      this.availablePorts.set(connectedPortNames);
      return connectedPortNames;
    } catch (err) {
      this.addLogMessage(`❌ Erro ao listar portas: ${err.message}`, 'error');
      return [];
    }
  }

  async requestNewPort() {
    if (!this.isSupported()) return null;
    
    try {
      const port = await navigator.serial.requestPort();
      const portInfo = port.getInfo();
      this.addLogMessage(`🔌 Porta selecionada: USB VID=${portInfo.usbVendorId || 'N/A'} PID=${portInfo.usbProductId || 'N/A'}`, 'info');
      const portId = `Port_${Date.now()}`; // ID único temporário
      return { port, portId };
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        this.addLogMessage(`❌ Erro ao solicitar porta: ${err.message}`, 'error');
      }
      return null;
    }
  }

  async connectPort(portId, port, baudRate) {
  if (!this.isSupported()) return false;

  try {
    console.log(`Tentando conectar à porta ${portId} com baudRate=${baudRate}...`);

    // Validação simples do baudRate
    const numericBaud = Number(baudRate);
    if (!Number.isFinite(numericBaud) || numericBaud <= 0) {
      this.addLogMessage(`❌ Baud rate inválido: ${baudRate}`, 'error');
      return false;
    }

    await port.open({ baudRate: numericBaud });

    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();
    
    this.serialPorts.set(portId, {
      port: port,
      writer: writer,
      reader: reader,
      baudRate: baudRate,
      isReading: true
    });

    this.updateConnectionStatus();
    this.addLogMessage(`✅ Porta ${portId} conectada. Baud rate: ${baudRate}`, 'info');
    this.startReading(portId);
    
    // Aguardar dados automáticos por 2 segundos antes de sugerir teste
    setTimeout(() => {
      if (!this.hasReceivedData(portId)) {
        this.addLogMessage('ℹ️ Use o botão "🔧 Test Comm" para testar diferentes protocolos.', 'info');
      }
    }, 2000);

    return true;
  } catch (err) {
    // Mensagens de erro mais detalhadas para diagnóstico
    const errName = err && err.name ? err.name : 'UnknownError';
    this.addLogMessage(`❌ Erro ao conectar ${portId}: [${errName}] ${err.message || err}`, 'error');
    console.error(`Erro ao conectar ${portId}:`, err);

    // Orientações específicas para NetworkError (problema comum no Linux)
    if (errName === 'NetworkError') {
      this.addLogMessage('💡 SOLUÇÃO: Erro de permissão detectado. Execute no terminal:', 'warn');
      this.addLogMessage('   sudo usermod -a -G dialout $USER', 'warn');
      this.addLogMessage('   Depois faça logout/login ou execute: newgrp dialout', 'warn');
      this.addLogMessage('   Reinicie a aplicação após aplicar as permissões.', 'warn');
    }

    // Tentar listar portas já autorizadas para diagnóstico (onde disponível)
    try {
      if (navigator.serial && navigator.serial.getPorts) {
        const ports = await navigator.serial.getPorts();
        const infoList = ports.map(p => p.getInfo ? p.getInfo() : {}).map((i, idx) => `#${idx + 1} VID=${i.usbVendorId||'N/A'} PID=${i.usbProductId||'N/A'}`);
        this.addLogMessage(`ℹ️ Ports authorized: ${infoList.join(' | ')}`, 'info');
      }
    } catch (listErr) {
      console.warn('Could not list serial ports for diagnostics:', listErr);
    }
    return false;
  }
}


  async disconnectPort(portId) {
    const portData = this.serialPorts.get(portId);
    if (!portData) return;

    portData.isReading = false;
    
    // Cancelar o reader
    try {
      await portData.reader.cancel();
    } catch (e) {
      console.warn('Reader failed to cancel:', e);
    }
    
    // Fechar o writer
    if (portData.writer) {
      try {
        await portData.writer.close();
      } catch (e) {
        console.warn('Writer failed to close:', e);
      }
    }
    
    // Fechar a porta
    try {
      await portData.port.close();
    } catch(e) {
      console.warn('Port failed to close:', e);
    }

    this.serialPorts.delete(portId);
    this.updateConnectionStatus();
    this.addLogMessage(`⚠️ Porta ${portId} desconectada.`, 'warn');
  }

  async disconnectAll() {
    const portIds = Array.from(this.serialPorts.keys());
    for (const portId of portIds) {
      await this.disconnectPort(portId);
    }
  }

  updateConnectionStatus() {
    const connected = Array.from(this.serialPorts.keys());
    this.connectedPorts.set(connected);
    this.isConnected.set(connected.length > 0);
    
    // Atualizar lista de portas disponíveis
    this.availablePorts.set(connected);
  }

  hasReceivedData(portId) {
    // Check if we have received data from this specific port
    return this.logMessages().some(log => 
      log.type === 'receive' && log.message.includes(portId)
    );
  }

  async startReading(portId) {
    const portData = this.serialPorts.get(portId);
    if (!portData) return;

    let buffer = '';

    while (portData.isReading && this.serialPorts.has(portId)) {
      try {
        const { value, done } = await portData.reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        buffer += text;
        
        // Process complete lines (handle both \r\n and \n)
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            this.addLogMessage(`← ${portId}: ${trimmedLine}`, 'receive');
          }
        }
        
        // Also handle data that doesn't end with newline (status messages)
        if (buffer.length > 50) { // Avoid infinite buffer growth
          const trimmedBuffer = buffer.trim();
          if (trimmedBuffer.length > 0) {
            this.addLogMessage(`← ${portId}: ${trimmedBuffer}`, 'receive');
          }
          buffer = '';
        }
        
      } catch (error) {
        if (error.message !== 'The device has been lost.') {
          this.addLogMessage(`❌ Read loop error ${portId}: ${error.message}`, 'error');
        }
        portData.isReading = false;
      }
    }
  }

  async sendCommand(command, addNewline = true, targetPortId = null) {
    if (this.serialPorts.size === 0) {
      this.addLogMessage('❌ Nenhuma porta conectada!', 'error');
      return false;
    }
    
    let portsToUse = [];
    
    if (targetPortId && this.serialPorts.has(targetPortId)) {
      // Enviar para porta específica
      portsToUse = [targetPortId];
    } else {
      // Enviar para todas as portas conectadas (como no Python)
      portsToUse = Array.from(this.serialPorts.keys());
    }
    
    let success = false;
    
    for (const portId of portsToUse) {
      const portData = this.serialPorts.get(portId);
      if (!portData?.writer) continue;
      
      try {
        const fullCommand = addNewline ? `${command}\r\n` : command;
        const encoder = new TextEncoder();
        await portData.writer.write(encoder.encode(fullCommand));
        this.addLogMessage(`→ ${portId}: ${command.trim()}`, 'send');
        success = true;
      } catch (err) {
        this.addLogMessage(`❌ Erro ao enviar para ${portId}: ${err.message}`, 'error');
      }
    }
    
    return success;
  }

  // Métodos de compatibilidade com a interface antiga
  async connect(baudRate) {
    const result = await this.requestNewPort();
    if (!result) return;
    
    const { port, portId } = result;
    return await this.connectPort(portId, port, baudRate);
  }

  async disconnect() {
    await this.disconnectAll();
  }
}