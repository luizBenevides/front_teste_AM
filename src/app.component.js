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
              <span *ngIf="hasReceivedData()" class="ml-4 text-green-400">
              🟢 Dados recebidos da máquina
              </span>
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
              <button (click)="testCommunication()" [disabled]="!isConnected()" class="control-btn bg-purple-600 hover:bg-purple-500">🔧 Test Comm</button>
              <!-- button (click)="executeFingerdown1()" [disabled]="!isConnected() || isRunningSequence()" class="control-btn bg-teal-600 hover:bg-teal-500">▶️ FingerDown 1</button -->
              <button (click)="executeK4s_1()" [disabled]="!isConnected() || isRunningSequence()" class="control-btn bg-green-600 hover:bg-green-500">
                🔘 Enviar K4_1
              </button>
              <button (click)="testG90Commands()" [disabled]="!isConnected() || isRunningSequence()" class="control-btn bg-sky-600 hover:bg-sky-500">🔄 Test G90</button>
              <button (click)="stopSequence()" [disabled]="!isRunningSequence()" class="control-btn bg-orange-600 hover:bg-orange-500">⏸️ Stop Sequence</button>
              </div>
              </div>

        <!-- Teste Manual dos Botões do Controle -->
        <div>
          <h2 class="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-4">🎮 Teste dos Botões do Controle</h2>
          
          <!-- Teste de Pressão Simples -->
          <div class="flex flex-wrap items-center gap-3 bg-slate-900/50 p-3 rounded-md mb-3">
            <button (click)="testarPressao()" [disabled]="!isConnected() || isRunningSequence() || isRunningLoop()" class="control-btn bg-yellow-600 hover:bg-yellow-500">
              👆 Só Pressionar
            </button>
            <div class="text-xs text-slate-400">
              Apenas pressiona e solta o botão (sem movimento)
            </div>
          </div>

          <!-- Teste Manual Individual -->
          <div class="flex flex-wrap items-center gap-3 bg-slate-900/50 p-3 rounded-md mb-3">
            <button (click)="executeManualButtonTest()" [disabled]="!isConnected() || isRunningSequence() || isRunningLoop()" class="control-btn bg-blue-600 hover:bg-blue-500">
              🎯 Teste Manual (1x)
            </button>
            <div class="text-xs text-slate-400">
              Executa 1 ciclo: Move → Pressiona → Solta (posição única)
            </div>
          </div>

          <!-- Loop Contínuo -->
          <div class="flex flex-wrap items-center gap-3 bg-slate-900/50 p-3 rounded-md mb-3">
            <label for="cycleCount" class="text-slate-400">Ciclos:</label>
            <input id="cycleCount" type="number" [(ngModel)]="cycleCount" min="1" max="999" class="form-input w-20" placeholder="5">
            <button (click)="iniciarLoopG90()" [disabled]="!isConnected() || isRunningLoop() || isRunningSequence()" class="control-btn bg-emerald-600 hover:bg-emerald-500">
              ▶️ Iniciar Loop G90
            </button>
            <button (click)="pararLoopG90()" [disabled]="!isRunningLoop()" class="control-btn bg-red-600 hover:bg-red-500">
              ⏹️ Parar Loop
            </button>
            <div *ngIf="isRunningLoop()" class="flex items-center gap-2 text-emerald-400">
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span>Loop Executando - Ciclo {{currentLoopCycle()}}/{{totalCycles()}}</span>
            </div>
          </div>
          
          <div class="text-xs text-slate-400 bg-slate-900/30 p-2 rounded">
            <strong>Sequência Loop Contínuo:</strong><br>
            • Posição 1: Move X29.441 Y71.726 → Pressiona → Solta<br>
            • Posição 2: Move X394.805 Y77.726 → Pressiona → Solta<br>
            • Repete continuamente até parar manualmente
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-4">Manual Commands</h2>
          <div class="space-y-4">
            <!-- Seção K7_1 e K4_1 com mais espaçamento -->
            <div class="bg-slate-900/50 p-4 rounded-md mb-6">
              <h3 class="text-md font-medium text-slate-300 mb-3">🔧 Controles Manuais</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button (click)="sendK7_1()" [disabled]="!isConnected()" class="control-btn bg-blue-600 hover:bg-blue-500">
                  🔧 K2_1 (Avançar Base)
                </button>
                <button (click)="sendK4_1()" [disabled]="!isConnected()" class="control-btn bg-green-600 hover:bg-green-500">
                  🔒 TRAVAR BERÇO K4_1
                </button>
                <button (click)="sendK4_0()" [disabled]="!isConnected()" class="control-btn bg-orange-600 hover:bg-orange-500">
                  🔓 K4_0 DESTRAVAR BERÇO
                </button>
                <button (click)="sendK2_0()" [disabled]="!isConnected()" class="control-btn bg-cyan-600 hover:bg-cyan-500">
                  ⬅️ K2_0 VOLTAR BERÇO
                </button>
                <button (click)="sendK7_0()" [disabled]="!isConnected()" class="control-btn bg-red-600 hover:bg-red-500">
                  ⬇️ K7_0 DESATIVAR PILHA 1
                </button>
                <button (click)="sendK6_0()" [disabled]="!isConnected()" class="control-btn bg-purple-600 hover:bg-purple-500">
                  📥 K6_0 DESATIVAR PILHA 2
                </button>
              </div>
            </div>
            
            <div class="flex flex-wrap items-center gap-3 bg-slate-900/50 p-3 rounded-md">
              <span class="font-mono text-slate-400">G90</span>
              <label for="g90x" class="text-slate-400">X:</label>
              <input id="g90x" type="text" [(ngModel)]="g90x" class="form-input w-24" placeholder="14.151">
              <label for="g90y" class="text-slate-400">Y:</label>
              <input id="g90y" type="text" [(ngModel)]="g90y" class="form-input w-24" placeholder="123.008">
              <label for="g90Repeats" class="text-slate-400">Repetir:</label>
              <input id="g90Repeats" type="number" [(ngModel)]="g90Repeats" min="1" max="99" class="form-input w-16" placeholder="1">
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
  baudRate1 = signal(9600);  // Match Python default
  baudRate2 = signal(9600);  // Match Python default
  baudRates = [9600, 19200, 38400, 57600, 115200];
  
  // Port management
  availablePorts = this.serialService.availablePorts;
  connectedPorts = this.serialService.connectedPorts;
  portConnections = signal(new Map()); // Track which logical port maps to which physical port

  g90x = signal('');
  g90y = signal('');
  g90Repeats = signal(1); // Nova variável para repetições
  customCommand = signal('');

  // Variáveis para loop contínuo de teste dos botões
  emExecucaoLoop = signal(false);
  currentLoopCycle = signal(0);
  totalCycles = signal(5);
  cycleCount = signal(5);
  loopCancelRequested = signal(false);

  g90Commands = signal([
    "G90 X14.151 Y123.008", "G90 X27.115 Y114.518", "G90 X40.277 Y100.832",
    "G90 X27.709 Y93.555", "G90 X13.756 Y61.850", "G90 X22.712 Y61.850",
    "G90 X32.806 Y61.850", "G90 X43.147 Y61.850", "G90 X0 Y0",
    "G90 X33 Y44"
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

  hasReceivedData() {
    // Check if we have any received messages in the log
    return this.logMessages().some(log => log.type === 'receive');
  }
  
  // Legacy methods for compatibility
  connect() {
    this.togglePort('port1');
  }
  
  disconnect() {
    this.disconnectAll();
  }

  async sendHome() {
    // Reset do GRBL
    await this.serialService.sendCommand('\x18', false);
    await this.delay(300);

    // Unlock
    await this.serialService.sendCommand('$X');
    await this.delay(300);

    // Home
    await this.serialService.sendCommand('$H');
  }

  testCommunication() {
    // Testar vários comandos e protocolos possíveis
    this.serialService.addLogMessage('🔧 Testando vários protocolos de comunicação...', 'info');
    
    const testCommands = [
      '?',           // Status query (G-code)
      'M114',        // Get current position (Marlin)
      'M115',        // Get firmware version (Marlin)  
      '\r\n',        // Simple newline
      'STATUS',      // Custom status
      'VER',         // Version command
      'HELLO',       // Hello command
      'AT',          // AT command (serial modems)
      'INFO',        // Info command
      '*',           // Wildcard
    ];
    
    testCommands.forEach((cmd, index) => {
      setTimeout(() => {
        this.serialService.sendCommand(cmd);
      }, index * 500); // 500ms between each command
    });
    
    setTimeout(() => {
      this.serialService.addLogMessage('🔍 Teste de comunicação finalizado. Se nenhuma resposta, a máquina pode usar protocolo proprietário.', 'warn');
    }, testCommands.length * 500 + 1000);
  }

  async sendG90Manual() {
    const x = this.g90x().trim();
    const y = this.g90y().trim();
    const repeats = this.g90Repeats() || 1;
    
    if (!x || !y) {
      alert("Please enter values for X and Y.");
      return;
    }

    const port1 = this.getPort1Id(); // movimento
    const port2 = this.getPort2Id(); // pressão

    if (!port1) {
      alert("Porta 1 não conectada!");
      return;
    }
    if (!port2) {
      alert("Porta 2 não conectada!");
      return;
    }

    // Evitar execução se já estiver executando
    if (this.isRunningSequence() || this.isRunningLoop()) {
      alert("Aguarde a operação atual terminar!");
      return;
    }

    this.isRunningSequence.set(true);

    try {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(),
        message: `=== INICIANDO G90 MANUAL X${x} Y${y} (${repeats}x repetições) ===`,
        type: "info"
      }]);

      for (let i = 1; i <= repeats; i++) {
        if (!this.isRunningSequence()) {
          this.logMessages.update(logs => [...logs, { 
            timestamp: new Date().toLocaleTimeString(),
            message: `G90 manual interrompido na repetição ${i}/${repeats}`,
            type: "warn"
          }]);
          break;
        }

        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(),
          message: `🔄 Repetição ${i}/${repeats}`,
          type: "info"
        }]);

        // ===== 1. Mover =====
        await this.serialService.sendCommand(`G90 X${x} Y${y}`, true, port1);
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(),
          message: `➡ [${i}/${repeats}] Movendo para X${x} Y${y}...`,
          type: "info"
        }]);
        await this.aguardarMovimentoConcluido();

        // ===== 2. Pressionar =====
        await this.serialService.sendCommand("P_2", false, port2);
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(),
          message: `👆 [${i}/${repeats}] Pressionando botão...`,
          type: "info"
        }]);
        await this.delay(1000);

        // ===== 3. Soltar =====
        await this.serialService.sendCommand("P_0", false, port2);
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(),
          message: `✋ [${i}/${repeats}] Liberando botão...`,
          type: "info"
        }]);
        await this.delay(500);

        // Delay entre repetições (exceto na última)
        if (i < repeats && this.isRunningSequence()) {
          this.logMessages.update(logs => [...logs, { 
            timestamp: new Date().toLocaleTimeString(),
            message: `✅ Repetição ${i}/${repeats} concluída. Aguardando próxima...`,
            type: "info"
          }]);
          await this.delay(1000);
        }
      }

      if (this.isRunningSequence()) {
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(),
          message: `=== G90 MANUAL CONCLUÍDO (${repeats}x repetições) ===`,
          type: "success"
        }]);
      }

      // limpa inputs
      this.g90x.set('');
      this.g90y.set('');
      this.g90Repeats.set(1);

    } catch (error) {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Erro no G90 manual: ${error.message}`,
        type: "error"
      }]);
    } finally {
      this.isRunningSequence.set(false);
    }
  }

  async executeK2_1() {
    const port = this.getPort2Id(); // supondo que é a porta usada
    if (!port) {
      alert("Porta 2 não conectada!");
      return;
    }

    try {
      // Envia comando K2_1 sem esperar resposta
      await this.serialService.sendCommand("K4_1", false, port);

      // Aguarda 1 segundo
      await this.delay(1000);

      // Opcional: log no painel
      this.logMessages.update(logs => [
        ...logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: "✅ Comando K4_1 enviado e 1s aguardado",
          type: "info"
        }
      ]);
    } catch (error) {
      this.logMessages.update(logs => [
        ...logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `❌ Erro ao enviar K2_1: ${error.message}`,
          type: "error"
        }
      ]);
    }
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

  // Métodos para comandos K7_1 e K4_1
  async sendK7_1() {
    const port2 = this.getPort2Id();
    if (!port2) {
      alert("Porta 2 não conectada!");
      return;
    }
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(),
      message: "🔧 Enviando K2_1 (Avançar Base)...",
      type: "info"
    }]);
    
    await this.serialService.sendCommand('K2_1', false, port2);
  }

  async sendK4_1() {
    const port2 = this.getPort2Id();
    if (!port2) {
      alert("Porta 2 não conectada!"); 
      return;
    }
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(),
      message: "🔒 Enviando K4_1 (Prender Controle)...",
      type: "info"
    }]);
    
    await this.serialService.sendCommand('K4_1', false, port2);
  }

  // Comando para desativar pilha 1
  async sendK7_0() {
    const port2 = this.getPort2Id();
    if (!port2) {
      alert("Porta 2 não conectada!");
      return;
    }
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(),
      message: "⬇️ Enviando K7_0 (DESATIVAR PILHA 1)...",
      type: "info"
    }]);
    
    await this.serialService.sendCommand('K7_0', false, port2);
  }

  // Comando para desativar pilha 2 (recolhe)
  async sendK6_0() {
    const port2 = this.getPort2Id();
    if (!port2) {
      alert("Porta 2 não conectada!");
      return;
    }
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(),
      message: "📥 Enviando K6_0 (DESATIVAR PILHA 2 - RECOLHE)...",
      type: "info"
    }]);
    
    await this.serialService.sendCommand('K6_0', false, port2);
  }

  // Método para K4_0 (que já estava funcionando)
  async sendK4_0() {
    const port2 = this.getPort2Id();
    if (!port2) {
      alert("Porta 2 não conectada!");
      return;
    }
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(),
      message: "🔓 Enviando K4_0 (DESTRAVAR BERÇO)...",
      type: "info"
    }]);
    
    await this.serialService.sendCommand('K4_0', false, port2);
  }

  // Comando para voltar o berço
  async sendK2_0() {
    const port2 = this.getPort2Id();
    if (!port2) {
      alert("Porta 2 não conectada!");
      return;
    }
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(),
      message: "⬅️ Enviando K2_0 (VOLTAR BERÇO)...",
      type: "info"
    }]);
    
    await this.serialService.sendCommand('K2_0', false, port2);
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
    await this.serialService.sendCommand('G90 X29.441 Y71.726');
    await this.delay(3000);  // Aumentado de 1200 para 3000ms
    
    if (!this.isRunningSequence()) return;
    await this.serialService.sendCommand('P_2', false);
    await this.delay(2500);  // Aumentado de 1000 para 2500ms
    
    if (this.isRunningSequence()) {
      this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: '=== ROTINA FINGERDOWN1 CONCLUÍDA ===', type: 'info' }]);
    } else {
      this.logMessages.update(logs => [...logs, { timestamp: new Date().toLocaleTimeString(), message: 'ROTINA FINGERDOWN1 INTERROMPIDA', type: 'warn' }]);
    }
    
    this.isRunningSequence.set(false);
  }

  // Função para testar apenas a pressão do botão (sem movimento)
  async testarPressao() {
    if (this.isRunningSequence() || this.isRunningLoop()) {
      return;
    }
    
    this.isRunningSequence.set(true);
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(), 
      message: '=== TESTE DE PRESSÃO ===', 
      type: 'info' 
    }]);

    try {
      // Apenas pressiona e solta, sem movimento
      if (this.getPort1Id()) {
        // Pressiona
        await this.serialService.sendCommand('P_2', false, this.getPort2Id());
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(), 
          message: '👆 Pressionando botão...', 
          type: 'info' 
        }]);
        
        await this.delay(1000); // Mantém pressionado por 1 segundo

        // Libera
        await this.serialService.sendCommand('P_0', false, this.getPort2Id());
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(), 
          message: '✋ Liberando botão...', 
          type: 'info' 
        }]);
        
        await this.delay(500);
      } else {
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(), 
          message: '❌ Porta 1 não conectada!', 
          type: 'error' 
        }]);
      }

      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: '✅ Teste de pressão concluído', 
        type: 'info' 
      }]);

    } catch (error) {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `❌ Erro no teste de pressão: ${error.message}`, 
        type: 'error' 
      }]);
    } finally {
      this.isRunningSequence.set(false);
    }
  }

  // Função para teste manual dos botões (1 ciclo apenas)
  async executeManualButtonTest() {
    if (this.isRunningSequence() || this.isRunningLoop()) {
      return;
    }
    
    this.isRunningSequence.set(true);
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(), 
      message: '=== TESTE MANUAL - 1 CICLO ===', 
      type: 'info' 
    }]);

    try {
      // Move para posição
      if (this.getPort1Id()) {
        await this.serialService.sendCommand('G90 X29.441 Y71.726', true, this.getPort1Id());
        await this.delay(1000);
      }

      // Pressiona
      if (this.getPort2Id()) {
        await this.serialService.sendCommand('P_1', false, this.getPort2Id());
        await this.delay(1000);

        // Libera pressionamento
        await this.serialService.sendCommand('P_0', false, this.getPort2Id());
        await this.delay(500);
      }

      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: '✅ Teste manual concluído', 
        type: 'info' 
      }]);

    } catch (error) {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `❌ Erro no teste manual: ${error.message}`, 
        type: 'error' 
      }]);
    } finally {
      this.isRunningSequence.set(false);
    }
  }

  // ========== NOVO SISTEMA DE LOOP CONTÍNUO ==========
  
  isRunningLoop() {
    return this.emExecucaoLoop();
  }

  async loopG90Limited(cycles = 5) {
    if (this.isRunningSequence()) return;

    this.isRunningSequence.set(true);
    this.currentLoopCycle.set(0);

    this.logMessages.update(logs => [
      ...logs,
      {
        timestamp: new Date().toLocaleTimeString(),
        message: `=== INICIANDO LOOP G90 LIMITADO (${cycles} ciclos) ===`,
        type: 'info'
      }
    ]);

    try {
      for (let cycle = 1; cycle <= cycles; cycle++) {
        this.currentLoopCycle.set(cycle);

        for (const command of this.g90Commands()) {

          // Checar interrupção manual
          if (!this.isRunningSequence()) {
            this.logMessages.update(logs => [
              ...logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                message: 'Loop G90 interrompido pelo usuário.',
                type: 'warn'
              }
            ]);
            return;
          }

          // ---- MOVIMENTO G90 ----
          await this.serialService.sendCommand(command);
          this.logMessages.update(logs => [
            ...logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              message: `➡ [Ciclo ${cycle}] Movendo para: ${command}`,
              type: 'info'
            }
          ]);
          await this.delay(1500);

          // ---- PRESSÃO (PORTA 2) ----
          const port2 = this.getPort2Id();
          if (port2) {
            await this.serialService.sendCommand('P_2', false, port2);
            this.logMessages.update(logs => [
              ...logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                message: `👆 [Ciclo ${cycle}] Pressionando botão (PORTA 2)...`,
                type: 'info'
              }
            ]);
            await this.delay(1000);

            await this.serialService.sendCommand('P_0', false, port2);
            this.logMessages.update(logs => [
              ...logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                message: `✋ [Ciclo ${cycle}] Liberando botão (PORTA 2)...`,
                type: 'info'
              }
            ]);
            await this.delay(500);
          } else {
            this.logMessages.update(logs => [
              ...logs,
              {
                timestamp: new Date().toLocaleTimeString(),
                message: '❌ Porta 2 não conectada! Pressão ignorada.',
                type: 'error'
              }
            ]);
          }
        }
      }

      this.logMessages.update(logs => [
        ...logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `=== LOOP G90 LIMITADO CONCLUÍDO (${cycles} ciclos) ===`,
          type: 'info'
        }
      ]);

    } catch (err) {
      this.logMessages.update(logs => [
        ...logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `❌ Erro no loop G90 limitado: ${err.message}`,
          type: 'error'
        }
      ]);
    } finally {
      this.isRunningSequence.set(false);
    }
  }

  async executarCicloG90() {
    for (const command of this.g90Commands()) {

      // Interrupção manual
      if (!this.isRunningLoop()) break;

      // Movimento
      await this.serialService.sendCommand(command);
      this.logMessages.update(logs => [
        ...logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `➡ Movendo para: ${command}`,
          type: 'info'
        }
      ]);
      await this.delay(1500);

      // Pressão
      const port2 = this.getPort2Id();
      if (port2) {
        await this.serialService.sendCommand('P_2', false, port2);
        this.logMessages.update(logs => [
          ...logs,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: '👆 Pressionando botão (PORTA 2)...',
            type: 'info'
          }
        ]);
        await this.delay(1000);

        await this.serialService.sendCommand('P_0', false, port2);
        this.logMessages.update(logs => [
          ...logs,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: '✋ Liberando botão (PORTA 2)...',
            type: 'info'
          }
        ]);
        await this.delay(500);
      }
    }
  }

  async iniciarLoopFingerdown() {
    if (this.emExecucaoLoop()) return;

    this.emExecucaoLoop.set(true);
    this.loopCancelRequested.set(false);
    this.currentLoopCycle.set(0);

    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(), 
      message: '=== INICIANDO LOOP CONTÍNUO FINGERDOWN ===', 
      type: 'info' 
    }]);

    try {
      while (!this.loopCancelRequested()) {

        this.currentLoopCycle.update(cycle => cycle + 1);

        // Executa o ciclo e captura a resposta
        const resposta = await this.executarCicloFingerdown();

        // 🔍 1 — Detecta ALARM vindo do GRBL
        if (resposta && resposta.includes("ALARM")) {

          this.logMessages.update(logs => [...logs, { 
            timestamp: new Date().toLocaleTimeString(), 
            message:
              `🚨 GRBL entrou em ALARM durante o ciclo ${this.currentLoopCycle()}. Resposta: ${resposta}`,
            type: 'error' 
          }]);

          // 🔧 2 — Reset do GRBL
          await this.serialService.sendCommand('\x18', false); // CTRL-X
          await this.delay(400);

          // 🔓 3 — Unlock
          await this.serialService.sendCommand('$X');
          await this.delay(400);

          // 🔚 4 — Encerrar o loop automaticamente
          this.loopCancelRequested.set(true);

          break; // encerra o while
        }

        // Delay entre ciclos
        if (!this.loopCancelRequested()) {
          await this.delay(500);
        }
      }

    } catch (error) {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `❌ Erro no loop: ${error.message}`, 
        type: 'error' 
      }]);

    } finally {
      this.emExecucaoLoop.set(false);

      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `=== LOOP CONTÍNUO FINALIZADO (${this.currentLoopCycle()} ciclos) ===`, 
        type: 'info' 
      }]);
    }
  }

  async iniciarLoopG90() {
    if (this.emExecucaoLoop() || this.isRunningSequence()) return;

    const cycles = this.cycleCount() || 5;
    this.totalCycles.set(cycles);
    this.emExecucaoLoop.set(true);
    this.loopCancelRequested.set(false);
    this.currentLoopCycle.set(0);

    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(), 
      message: `=== INICIANDO LOOP G90 (${cycles} ciclos) ===`, 
      type: 'info' 
    }]);

    try {
      for (let cycle = 1; cycle <= cycles; cycle++) {
        if (this.loopCancelRequested()) {
          this.logMessages.update(logs => [...logs, { 
            timestamp: new Date().toLocaleTimeString(), 
            message: 'Loop G90 interrompido pelo usuário.', 
            type: 'warn' 
          }]);
          break;
        }

        this.currentLoopCycle.set(cycle);
        
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(), 
          message: `🔄 Iniciando ciclo ${cycle}/${cycles}`, 
          type: 'info' 
        }]);

        // Executa todos os comandos G90
        for (const command of this.g90Commands()) {
          if (this.loopCancelRequested()) break;

          // ---- MOVIMENTO G90 ----
          await this.serialService.sendCommand(command);
          this.logMessages.update(logs => [...logs, {
            timestamp: new Date().toLocaleTimeString(),
            message: `➡ [${cycle}/${cycles}] Movendo para: ${command}`,
            type: 'info'
          }]);
          
          // Aguardar MOV_FIM antes de pressionar
          await this.aguardarMovimentoConcluido();
          
          // Verificar se houve ALARM nos logs recentes
          const recentLogs = this.logMessages().slice(-3);
          const hasAlarm = recentLogs.some(log => 
            log.type === 'receive' && log.message.includes('ALARM')
          );
          
          if (hasAlarm) {
            this.logMessages.update(logs => [...logs, {
              timestamp: new Date().toLocaleTimeString(),
              message: `🚨 ALARM detectado! Resetando GRBL e pulando para próximo ciclo...`,
              type: 'error'
            }]);
            
            // Reset do GRBL
            await this.serialService.sendCommand('\x18', false);
            await this.delay(500);
            await this.serialService.sendCommand('$X');
            await this.delay(500);
            
            break; // Sair do loop de comandos G90 deste ciclo
          }

          // ---- PRESSÃO APÓS O MOVIMENTO ----
          const port2 = this.getPort2Id();
          if (port2) {
            // Pressiona
            await this.serialService.sendCommand('P_2', false, port2);
            this.logMessages.update(logs => [...logs, {
              timestamp: new Date().toLocaleTimeString(),
              message: `👆 [${cycle}/${cycles}] Pressionando botão...`,
              type: 'info'
            }]);
            await this.delay(1000);

            // Solta
            await this.serialService.sendCommand('P_0', false, port2);
            this.logMessages.update(logs => [...logs, {
              timestamp: new Date().toLocaleTimeString(),
              message: `✋ [${cycle}/${cycles}] Liberando botão...`,
              type: 'info'
            }]);
            await this.delay(500);
          } else {
            this.logMessages.update(logs => [...logs, {
              timestamp: new Date().toLocaleTimeString(),
              message: '❌ Porta 2 não conectada! Pressão ignorada.',
              type: 'error'
            }]);
          }
        }

        // HOME entre ciclos (exceto no último ciclo)
        if (cycle < cycles && !this.loopCancelRequested()) {
          this.logMessages.update(logs => [...logs, {
            timestamp: new Date().toLocaleTimeString(),
            message: `✅ Ciclo ${cycle}/${cycles} concluído. Executando HOME...`,
            type: 'info'
          }]);

          // Executar HOME com delay adequado
          await this.serialService.sendCommand('$H');
          this.logMessages.update(logs => [...logs, {
            timestamp: new Date().toLocaleTimeString(),
            message: `🏠 HOME executado. Aguardando 3s antes do próximo ciclo...`,
            type: 'info'
          }]);
          await this.delay(3000); // Delay maior para HOME completar
        }
      }

      if (!this.loopCancelRequested()) {
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(), 
          message: `=== LOOP G90 CONCLUÍDO (${this.currentLoopCycle()}/${cycles} ciclos) ===`, 
          type: 'info' 
        }]);
      }

    } catch (error) {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `❌ Erro no loop G90: ${error.message}`, 
        type: 'error' 
      }]);
    } finally {
      this.emExecucaoLoop.set(false);
    }
  }


  // Para interromper o loop
  pararLoopG90() {
    this.loopCancelRequested.set(true);
    this.emExecucaoLoop.set(false);
  }



  pararLoopFingerdown() {
    this.loopCancelRequested.set(true);
  }

  async executarCicloFingerdown() {
    try {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `🔄 Ciclo ${this.currentLoopCycle()}`,
        type: 'info'
      }]);

      let resposta = "";

      const port1 = this.getPort1Id();  // movimento
      const port2 = this.getPort2Id();  // pressão

      // segurança extra
      if (!port1) return "ERRO: Porta 1 não conectada!";
      if (!port2) return "ERRO: Porta 2 não conectada!";

      // percorre as posições do testG90
      for (const cmd of this.g90Commands()) {

        if (this.loopCancelRequested()) break;

        // ===== MOVIMENTO ===== (PORTA 1)
        resposta = await this.serialService.sendCommand(cmd, true, port1);
        if (this._detectaAlarm(resposta)) return resposta;

        await this.aguardarMovimentoConcluido();

        if (this.loopCancelRequested()) break;

        // ===== PRESSIONAR ===== (PORTA 2)
        resposta = await this.serialService.sendCommand("P_2", false, port2);
        if (this._detectaAlarm(resposta)) return resposta;

        await this.delay(1000);

        // ===== SOLTAR ===== (PORTA 2)
        resposta = await this.serialService.sendCommand("P_0", false, port2);
        if (this._detectaAlarm(resposta)) return resposta;

        await this.delay(500);
      }

      return resposta;

    } catch (error) {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `❌ Erro no ciclo fingerdown: ${error.message}`,
        type: 'error'
      }]);
      throw error;
    }
  }



  async aguardarMovimentoConcluido() {
    const timeoutMs = 2000; // Aumentado para 10 segundos
    const startTime = Date.now();
    
    this.logMessages.update(logs => [...logs, { 
      timestamp: new Date().toLocaleTimeString(), 
      message: '⏳ Aguardando movimento concluir (MOV_FIM)...', 
      type: 'info' 
    }]);

    while (!this.loopCancelRequested() && (Date.now() - startTime < timeoutMs)) {
      // Verificar nos logs se recebeu "MOV_FIM"
      const recentLogs = this.logMessages().slice(-5); // Últimos 5 logs
      const movimentoFim = recentLogs.some(log => 
        log.type === 'receive' && log.message.includes('MOV_FIM')
      );
      
      if (movimentoFim) {
        this.logMessages.update(logs => [...logs, { 
          timestamp: new Date().toLocaleTimeString(), 
          message: '✅ Movimento concluído (MOV_FIM recebido)', 
          type: 'info' 
        }]);
        await this.delay(200); // Pequeno delay extra para estabilizar
        return;
      }
      
      await this.delay(50); // Verificar a cada 50ms para ser mais responsivo
    }
    
    if (this.loopCancelRequested()) {
      throw new Error('Movimento cancelado pelo usuário');
    } else {
      this.logMessages.update(logs => [...logs, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: '⚠️ Timeout ao aguardar movimento (10s) - Continuando...', 
        type: 'warn' 
      }]);
      // Não lança erro, apenas continua com delay de segurança
      await this.delay(1000);
    }
  }

  // Métodos auxiliares para obter IDs das portas
  getPort1Id() {
    return this.portConnections().get('port1') || null;
  }

  getPort2Id() {
    return this.portConnections().get('port2') || null;
  }
  
  async testG90Commands() {
    if (this.isRunningSequence()) return;

    this.isRunningSequence.set(true);

    this.logMessages.update(logs => [
      ...logs,
      {
        timestamp: new Date().toLocaleTimeString(),
        message: '=== TESTANDO COMANDOS G90 COM PRESSÃO ===',
        type: 'info'
      }
    ]);

    try {

      for (const command of this.g90Commands()) {

        // Interrupção manual
        if (!this.isRunningSequence()) {
          this.logMessages.update(logs => [
            ...logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              message: 'Teste G90 interrompido pelo usuário.',
              type: 'warn'
            }
          ]);
          break;
        }

        // ---- MOVIMENTO G90 ----
        await this.serialService.sendCommand(command);
        this.logMessages.update(logs => [
          ...logs,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: `➡ Movendo para: ${command}`,
            type: 'info'
          }
        ]);
        await this.delay(1500);

        // ---- PRESSÃO APÓS O MOVIMENTO ----
        const port2 = this.getPort2Id();

        if (port2) {
          // Pressiona
          await this.serialService.sendCommand('P_2', false, port2);
          this.logMessages.update(logs => [
            ...logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              message: '👆 Pressionando botão (PORTA 2)...',
              type: 'info'
            }
          ]);
          await this.delay(1000);

          // Solta
          await this.serialService.sendCommand('P_0', false, port2);
          this.logMessages.update(logs => [
            ...logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              message: '✋ Liberando botão (PORTA 2)...',
              type: 'info'
            }
          ]);
          await this.delay(500);

        } else {
          this.logMessages.update(logs => [
            ...logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              message: '❌ Porta 2 não conectada! Pressão ignorada.',
              type: 'error'
            }
          ]);
        }
      }

      if (this.isRunningSequence()) {
        this.logMessages.update(logs => [
          ...logs,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: '=== TESTE G90 + PRESSÃO CONCLUÍDO ===',
            type: 'info'
          }
        ]);
      }

    } catch (err) {
      this.logMessages.update(logs => [
        ...logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `❌ Erro no teste G90: ${err.message}`,
          type: 'error'
        }
      ]);
    } finally {
      this.isRunningSequence.set(false);
    }
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

      //await this.serialService.sendCommand(this.g90Commands()[i]);
      // ---- MOVIMENTO G90 ----
      const response = await this.serialService.sendCommand(command);
      // Detecta ALARM vindo do GRBL
      if (response.includes("ALARM")) {

        this.logMessages.update(logs => [
          ...logs,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: `🚨 GRBL entrou em ALARM! Resposta: ${response}`,
            type: 'error'
          }
        ]);

        // Reset do GRBL
        this.serialService.sendRaw("\x18"); // CTRL-X
        await this.delay(500);

        // Desbloqueio (alguns alarms precisam)
        await this.serialService.sendCommand("$X");
        await this.delay(500);

        this.logMessages.update(logs => [
          ...logs,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: "⚠️ GRBL resetado após ALARM.",
            type: 'warn'
          }
        ]);

        break; // <-- interrompe o teste G90
      }

      
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