import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SerialService } from './services/serial.service.js';

export const AppComponent = Component({
  selector: 'app-root',
  template: `<div class="container mx-auto p-4 lg:p-6 max-w-7xl space-y-4">
  <header class="flex justify-between items-center mb-4">
    <h1 class="text-3xl font-bold text-cyan-400">Hardware Controller</h1>
    <div class="text-sm text-slate-400">Web Serial API Interface</div>
  </header>

  <div *ngIf="!isSupported()" class="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
    <strong class="font-bold">Browser Not Supported!</strong>
    <span class="block sm:inline">The Web Serial API is not available in your browser. Please use a supported browser like Chrome or Edge.</span>
  </div>

  <!-- Multiple Ports Configuration Panel -->
  <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
    <h2 class="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-4">Configuração das Portas Seriais</h2>
    
    <!-- Port 1 Configuration -->
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <label class="text-slate-400 font-medium">Porta 1:</label>
      
      <select [(ngModel)]="selectedPort1" class="bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none min-w-32">
        <option value="">Selecione uma porta...</option>
        <option *ngFor="let port of availablePorts()" [value]="port">{{ port }}</option>
      </select>
      
      <label class="text-slate-400">Baudrate:</label>
      <select [(ngModel)]="baudRate1" class="bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
        <option *ngFor="let rate of baudRates" [value]="rate">{{ rate }}</option>
      </select>
      
      <button (click)="togglePort('port1')" 
              [disabled]="!isSupported() || !selectedPort1" 
              [class]="isPortConnected('port1') ? 'control-btn bg-red-600 hover:bg-red-500' : 'control-btn bg-cyan-600 hover:bg-cyan-500'">
        {{ isPortConnected('port1') ? 'Desconectar' : 'Conectar' }} Porta 1
      </button>
      
      <div *ngIf="isPortConnected('port1')" class="flex items-center gap-2 text-green-400">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span>Porta 1 Conectada</span>
      </div>
    </div>

    <!-- Port 2 Configuration -->
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <label class="text-slate-400 font-medium">Porta 2:</label>
      
      <select [(ngModel)]="selectedPort2" class="bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none min-w-32">
        <option value="">Selecione uma porta...</option>
        <option *ngFor="let port of availablePorts()" [value]="port">{{ port }}</option>
      </select>
      
      <label class="text-slate-400">Baudrate:</label>
      <select [(ngModel)]="baudRate2" class="bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
        <option *ngFor="let rate of baudRates" [value]="rate">{{ rate }}</option>
      </select>
      
      <button (click)="togglePort('port2')" 
              [disabled]="!isSupported() || !selectedPort2" 
              [class]="isPortConnected('port2') ? 'control-btn bg-red-600 hover:bg-red-500' : 'control-btn bg-cyan-600 hover:bg-cyan-500'">
        {{ isPortConnected('port2') ? 'Desconectar' : 'Conectar' }} Porta 2
      </button>
      
      <div *ngIf="isPortConnected('port2')" class="flex items-center gap-2 text-green-400">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span>Porta 2 Conectada</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-4">
      <button (click)="requestNewPort()" 
              [disabled]="!isSupported()" 
              class="control-btn black-btn">
        📋 Adicionar Nova Porta
      </button>

      <button (click)="refreshPorts()" 
              [disabled]="!isSupported()" 
              class="control-btn black-btn">
        🔄 Atualizar Portas
      </button>
      
      <button (click)="disconnectAll()" 
              [disabled]="connectedPorts().length === 0" 
              class="control-btn bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600">
        ⚠️ Desconectar Todas
      </button>
    </div>
    
    <!-- Connection Status -->
    <div class="mt-4 text-sm text-slate-400">
      Status: <span class="font-mono">{{ getConnectionStatus() }}</span>
    </div>
  </div>

  <!-- Main Grid Layout -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    
    <!-- Left Column: Controls -->
    <div class="lg:col-span-2 space-y-4">

      <!-- Routines & Manual Commands -->
      <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-6">
        <div>
          <h2 class="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-4">Routines & Controls</h2>
          <div class="flex flex-wrap gap-3">
            <button (click)="sendHome()" [disabled]="!isConnected()" class="control-btn bg-indigo-600 hover:bg-indigo-500">🏠 Home</button>
            <button (click)="executeFingerdown1()" [disabled]="!isConnected() || isRunningSequence()" class="control-btn bg-teal-600 hover:bg-teal-500">▶️ FingerDown 1</button>
            <button (click)="testG90Commands()" [disabled]="!isConnected() || isRunningSequence()" class="control-btn bg-sky-600 hover:bg-sky-500">🔄 Test G90</button>
            <button (click)="stopSequence()" [disabled]="!isRunningSequence()" class="control-btn bg-orange-600 hover:bg-orange-500">⏸️ Stop Sequence</button>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-4">Manual Commands</h2>
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-3 bg-slate-900/50 p-3 rounded-md">
              <span class="font-mono text-slate-400">G90</span>
              <label for="g90x" class="text-slate-400">X:</label>
              <input id="g90x" type="text" [(ngModel)]="g90x" class="form-input w-24" placeholder="14.151">
              <label for="g90y" class="text-slate-400">Y:</label>
              <input id="g90y" type="text" [(ngModel)]="g90y" class="form-input w-24" placeholder="123.008">
              <button (click)="sendG90Manual()" [disabled]="!isConnected()" class="action-btn">Send G90</button>
            </div>
            <div class="flex flex-wrap items-center gap-3 bg-slate-900/50 p-3 rounded-md">
              <label for="custom" class="text-slate-400">Command:</label>
              <input id="custom" type="text" [(ngModel)]="customCommand" (keyup.enter)="sendCustomCommand()" class="form-input flex-grow" placeholder="Enter any command...">
              <button (click)="sendCustomCommand()" [disabled]="!isConnected()" class="action-btn">Send Command</button>
            </div>
          </div>
        </div>
      </div>

      <!-- G90 Sequence -->
      <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <div class="border-b border-slate-600 pb-2 mb-4">
          <h2 class="text-lg font-semibold text-slate-300">G90 Sequence (2s Delay)</h2>
          <p class="text-sm text-slate-400">Execute a predefined sequence of G90 commands or run them individually.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <button (click)="executeG90Sequence()" [disabled]="!isConnected() || isRunningSequence()" class="control-btn bg-green-700 hover:bg-green-600">▶️ Execute Full Sequence</button>
          <button (click)="resetSequence()" [disabled]="!isConnected()" class="control-btn bg-yellow-600 hover:bg-yellow-500">🔁 Reset Sequence</button>
          <span class="font-mono bg-slate-700 px-3 py-1 rounded-md text-slate-300">{{ sequenceStatusText() }}</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div *ngFor="let command of g90Commands(); let i = index" class="relative">
            <button (click)="sendSingleG90(command)" [disabled]="!isConnected() || isRunningSequence()" class="w-full text-left font-mono text-sm bg-slate-700 hover:bg-slate-600/70 disabled:bg-slate-700/50 disabled:cursor-not-allowed p-2 rounded-md transition-colors">
              <span class="text-cyan-400">{{ i + 1 }}.</span> {{ command }}
              <div class="absolute top-1 right-1 text-xs">
                  <span *ngIf="g90ButtonStatuses()[i] === 'executing'">⏳</span>
                  <span *ngIf="g90ButtonStatuses()[i] === 'completed'" class="text-green-400">✔️</span>
                  <span *ngIf="g90ButtonStatuses()[i] === 'idle'" class="text-slate-500">⏹️</span>
              </div>
            </button>
          </div>
        </div>
      </div>

    </div>
    
    <!-- Right Column: Log -->
    <div class="lg:col-span-1">
      <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700 h-full flex flex-col">
        <h2 class="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-4 flex-shrink-0">Communication Log</h2>
        <div class="bg-slate-900/70 rounded-md p-3 flex-grow overflow-y-auto h-96 font-mono text-sm space-y-1">
          <div *ngFor="let log of logMessages()" 
               [ngClass]="{
                 'text-cyan-400': log.type === 'send',
                 'text-lime-400': log.type === 'receive',
                 'text-red-400': log.type === 'error',
                 'text-yellow-400': log.type === 'warn',
                 'text-slate-400': log.type === 'info'
               }">
            <span class="text-slate-500 mr-2">[{{ log.timestamp }}]</span>
            <span>{{ log.message }}</span>
          </div>
          <div *ngIf="logMessages().length === 0" class="text-slate-500">Waiting for connection...</div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})(class {
  serialService = inject(SerialService);
  
  // Multiple port configuration
  selectedPort1 = signal('');
  selectedPort2 = signal('');
  baudRate1 = signal(9600);
  baudRate2 = signal(9600);
  baudRates = [9600, 19200, 38400, 57600, 115200];
  
  // Port management
  availablePorts = this.serialService.availablePorts;
  connectedPorts = this.serialService.connectedPorts;
  portConnections = signal(new Map()); // Track which logical port maps to which physical port

  g90x = signal('');
  g90y = signal('');
  customCommand = signal('');

  g90Commands = signal([
    "G90 X14.151 Y123.008", "G90 X27.115 Y114.518", "G90 X40.277 Y100.832",
    "G90 X27.709 Y93.555", "G90 X13.756 Y61.850", "G90 X22.712 Y61.850",
    "G90 X32.806 Y61.850", "G90 X43.147 Y61.850", "G90 X0 Y0",
    "G90 X33 Y44", "G90 X11 Y4555"
  ]);

  g90ButtonStatuses = signal(this.g90Commands().map(() => 'idle'));
  
  isRunningSequence = signal(false);
  currentCommandIndex = signal(0);
  sequenceStatusText = computed(() => {
    if (this.currentCommandIndex() >= this.g90Commands().length) {
        return `Sequence Completed ${this.g90Commands().length}/${this.g90Commands().length}`;
    }
    return `Ready - Command ${this.currentCommandIndex() + 1}/${this.g90Commands().length}`;
  });

  logMessages = this.serialService.logMessages;
  isConnected = this.serialService.isConnected;
  isSupported = this.serialService.isSupported;

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async refreshPorts() {
    await this.serialService.refreshPorts();
  }

  async requestNewPort() {
    const result = await this.serialService.requestNewPort();
    if (result) {
      // Add the new port to available ports list
      const currentPorts = this.availablePorts();
      const newPortId = result.portId;
      this.availablePorts.set([...currentPorts, newPortId]);
      
      // Auto-select it if no port is selected
      if (!this.selectedPort1()) {
        this.selectedPort1.set(newPortId);
      } else if (!this.selectedPort2()) {
        this.selectedPort2.set(newPortId);
      }
    }
  }

  async togglePort(portKey) {
    const portId = portKey === 'port1' ? this.selectedPort1() : this.selectedPort2();
    const baudRate = portKey === 'port1' ? this.baudRate1() : this.baudRate2();
    
    if (!portId) {
      alert('Por favor, selecione uma porta primeiro.');
      return;
    }

    if (this.isPortConnected(portKey)) {
      // Disconnect
      const physicalPortId = this.portConnections().get(portKey);
      if (physicalPortId) {
        await this.serialService.disconnectPort(physicalPortId);
        const connections = new Map(this.portConnections());
        connections.delete(portKey);
        this.portConnections.set(connections);
      }
    } else {
      // Connect - request new port first if needed
      const result = await this.serialService.requestNewPort();
      if (result) {
        const { port, portId } = result;
        const success = await this.serialService.connectPort(portId, port, baudRate);
        
        if (success) {
          const connections = new Map(this.portConnections());
          connections.set(portKey, portId);
          this.portConnections.set(connections);
        }
      }
    }
  }

  isPortConnected(portKey) {
    const physicalPortId = this.portConnections().get(portKey);
    return physicalPortId && this.connectedPorts().includes(physicalPortId);
  }

  async disconnectAll() {
    await this.serialService.disconnectAll();
    this.portConnections.set(new Map());
  }

  getConnectionStatus() {
    const connected = this.connectedPorts();
    if (connected.length === 0) return 'Nenhuma porta conectada';
    if (connected.length === 1) return `1 porta conectada: ${connected[0]}`;
    return `${connected.length} portas conectadas: ${connected.join(', ')}`;
  }
  
  // Legacy methods for compatibility
  connect() {
    this.togglePort('port1');
  }
  
  disconnect() {
    this.disconnectAll();
  }

  sendHome() {
    this.serialService.sendCommand('$H');
  }

  sendG90Manual() {
    const x = this.g90x().trim();
    const y = this.g90y().trim();
    if (!x || !y) {
      alert("Please enter values for X and Y.");
      return;
    }
    this.serialService.sendCommand(`G90 X${x} Y${y}`);
    this.g90x.set('');
    this.g90y.set('');
  }
  
  sendCustomCommand() {
    const cmd = this.customCommand().trim();
    if (!cmd) {
        alert("Please enter a command.");
        return;
    }
    this.serialService.sendCommand(cmd);
    this.customCommand.set('');
  }
  
  sendSingleG90(command) {
    this.serialService.sendCommand(command);
  }
  async executeFingerdown1() {
    if (this.isRunningSequence()) {
      return;
    }
    this.isRunningSequence.set(true);
    this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: '=== INICIANDO ROTINA FINGERDOWN1 ===', type: 'info' }]);
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('K7_1', false);
    await this.delay(1000);  // Aumentado de 300 para 1000ms
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('K7_1', false);
    await this.delay(1500);  // Aumentado de 500 para 1500ms
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('K2_1', false);
    await this.delay(2000);  // Aumentado de 1000 para 2000ms
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('G90 X29.441 Y71.726');
    await this.delay(3000);  // Aumentado de 1200 para 3000ms
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('P_1', false);
    await this.delay(2500);  // Aumentado de 1000 para 2500ms
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('K4_1', false);
    await this.delay(1500);  // Aumentado de 500 para 1500ms
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('P_0', false);
    await this.delay(3000);  // Aumentado de 1500 para 3000ms
    
    if (this.isRunningSequence()) {
      this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: '=== ROTINA FINGERDOWN1 CONCLUÍDA ===', type: 'info' }]);
    } else {
      this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: 'ROTINA FINGERDOWN1 INTERROMPIDA', type: 'warn' }]);
    }
    
    this.isRunningSequence.set(false);
  }
  
  async testG90Commands() {
    if (this.isRunningSequence()) {
      return;
    }
    this.isRunningSequence.set(true);
    this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: '=== TESTANDO COMANDOS G90 ===', type: 'info' }]);
    
    for (const command of this.g90Commands()) {
        if (!this.isRunningSequence()) {
          this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: 'Teste G90 interrompido pelo usuário.', type: 'warn' }]);
          this.isRunningSequence.set(false);
          return;
        }
        await this.serialService.sendCommand(command);
        await this.delay(1500);  // Aumentado de 500 para 1500ms
    }
    
    if (this.isRunningSequence()) {
      this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: '=== COMANDOS G90 TESTADOS ===', type: 'info' }]);
    }
    this.isRunningSequence.set(false);
  }

  async executeG90Sequence() {
    if (this.isRunningSequence()) {
      return;
    }
    this.isRunningSequence.set(true);
    this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: '=== INICIANDO SEQUÊNCIA G90 COMPLETA ===', type: 'info' }]);
    
    for (let i = this.currentCommandIndex(); i < this.g90Commands().length; i++) {
      if (!this.isRunningSequence()) {
        this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: 'Sequência interrompida pelo usuário.', type: 'warn' }]);
        return;
      }
      
      this.currentCommandIndex.set(i);
      
      this.g90ButtonStatuses.update(statuses => {
        statuses[i] = 'executing';
        return [...statuses];
      });

      await this.serialService.sendCommand(this.g90Commands()[i]);
      
      await this.delay(3000);  // Aumentado de 2000 para 3000ms

      this.g90ButtonStatuses.update(statuses => {
        statuses[i] = 'completed';
        return [...statuses];
      });
    }

    if (this.isRunningSequence()) {
        this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: '=== SEQUÊNCIA G90 CONCLUÍDA ===', type: 'info' }]);
    }
    this.currentCommandIndex.set(this.g90Commands().length);
    this.isRunningSequence.set(false);
  }

  stopSequence() {
    this.isRunningSequence.set(false);
  }
  
  resetSequence() {
    this.isRunningSequence.set(false);
    this.currentCommandIndex.set(0);
    this.g90ButtonStatuses.set(this.g90Commands().map(() => 'idle'));
    this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: 'Sequência reiniciada.', type: 'info' }]);
  }
});