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
      await port.open({ baudRate });

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

      return true;
    } catch (err) {
      this.addLogMessage(`❌ Erro ao conectar ${portId}: ${err.message}`, 'error');
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

  async startReading(portId) {
    const portData = this.serialPorts.get(portId);
    if (!portData) return;

    while (portData.isReading && this.serialPorts.has(portId)) {
      try {
        const { value, done } = await portData.reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        this.addLogMessage(`← ${portId}: ${text.trim()}`, 'receive');
      } catch (error) {
        this.addLogMessage(`❌ Read loop error ${portId}: ${error.message}`, 'error');
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