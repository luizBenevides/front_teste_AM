#!/usr/bin/env python3
"""
Exemplo de integração automática - Sistema que aciona GET Nano baseado em eventos
"""

import requests
import time
import json
from datetime import datetime
import threading
from flask import Flask, request, jsonify

# Cliente para comunicação com a API GET Nano
class AutoGetNanoTrigger:
    def __init__(self, api_base_url="http://localhost:3001"):
        self.api_base_url = api_base_url
        self.session = requests.Session()
        self.is_running = False
        
    def trigger_get_nano(self, nano="nano1", reason="Manual trigger"):
        """Acionar GET Nano e retornar resultado"""
        print(f"🎯 Acionando GET {nano.upper()} - Motivo: {reason}")
        
        try:
            # Verificar se o nano está conectado
            status = self.session.get(f"{self.api_base_url}/status").json()
            if not status.get("nanos", {}).get(nano, {}).get("connected", False):
                return {"success": False, "error": f"{nano.upper()} não conectado"}
            
            # Executar GET
            result = self.session.post(
                f"{self.api_base_url}/get-nano/{nano}",
                json={"timeout": 10000},
                timeout=15
            )
            
            if result.status_code == 200:
                data = result.json()
                print(f"✅ GET {nano.upper()} executado com sucesso!")
                print(f"📡 Dados: {data.get('data', '')[:100]}...")
                return data
            else:
                error_msg = f"HTTP {result.status_code}"
                print(f"❌ Erro ao executar GET {nano.upper()}: {error_msg}")
                return {"success": False, "error": error_msg}
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Exceção ao executar GET {nano.upper()}: {error_msg}")
            return {"success": False, "error": error_msg}
    
    def auto_trigger_timer(self, interval_seconds=60):
        """Acionar GET automaticamente em intervalos"""
        print(f"⏰ Auto-trigger iniciado - Intervalo: {interval_seconds}s")
        
        self.is_running = True
        while self.is_running:
            try:
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"\n[{timestamp}] Auto-trigger executando...")
                
                # Verificar status dos nanos
                status = self.session.get(f"{self.api_base_url}/status").json()
                nanos = status.get("nanos", {})
                
                # Executar GET nos nanos conectados
                if nanos.get("nano1", {}).get("connected"):
                    self.trigger_get_nano("nano1", "Auto-trigger timer")
                    time.sleep(2)  # Pequena pausa entre comandos
                
                if nanos.get("nano2", {}).get("connected"):
                    self.trigger_get_nano("nano2", "Auto-trigger timer")
                
                time.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Erro no auto-trigger: {e}")
                time.sleep(10)
        
        print("🛑 Auto-trigger parado")
    
    def stop_auto_trigger(self):
        """Parar auto-trigger"""
        self.is_running = False

# Servidor web para receber comandos externos
app = Flask(__name__)
trigger_system = AutoGetNanoTrigger()

@app.route('/')
def home():
    return jsonify({
        "service": "Auto GET Nano Trigger",
        "status": "running",
        "endpoints": {
            "POST /trigger/nano1": "Acionar GET Nano 1",
            "POST /trigger/nano2": "Acionar GET Nano 2", 
            "POST /trigger/both": "Acionar ambos os Nanos",
            "GET /status": "Status do serviço",
            "POST /auto-start": "Iniciar auto-trigger",
            "POST /auto-stop": "Parar auto-trigger"
        }
    })

@app.route('/trigger/nano1', methods=['POST'])
def trigger_nano1():
    """Endpoint para acionar GET Nano 1"""
    data = request.get_json() or {}
    reason = data.get('reason', 'API call')
    
    result = trigger_system.trigger_get_nano("nano1", reason)
    return jsonify(result)

@app.route('/trigger/nano2', methods=['POST'])
def trigger_nano2():
    """Endpoint para acionar GET Nano 2"""
    data = request.get_json() or {}
    reason = data.get('reason', 'API call')
    
    result = trigger_system.trigger_get_nano("nano2", reason)
    return jsonify(result)

@app.route('/trigger/both', methods=['POST'])
def trigger_both():
    """Endpoint para acionar ambos os Nanos"""
    data = request.get_json() or {}
    reason = data.get('reason', 'API call - both nanos')
    
    result1 = trigger_system.trigger_get_nano("nano1", reason)
    time.sleep(2)
    result2 = trigger_system.trigger_get_nano("nano2", reason)
    
    return jsonify({
        "nano1": result1,
        "nano2": result2
    })

@app.route('/status')
def status():
    """Status do serviço trigger"""
    try:
        # Verificar conectividade com API principal
        api_status = trigger_system.session.get(f"{trigger_system.api_base_url}/status").json()
        
        return jsonify({
            "trigger_service": "online",
            "auto_trigger_running": trigger_system.is_running,
            "api_connection": "connected",
            "nanos": api_status.get("nanos", {})
        })
    except:
        return jsonify({
            "trigger_service": "online", 
            "auto_trigger_running": trigger_system.is_running,
            "api_connection": "disconnected",
            "nanos": {}
        })

# Thread para auto-trigger
auto_trigger_thread = None

@app.route('/auto-start', methods=['POST'])
def start_auto_trigger():
    """Iniciar auto-trigger"""
    global auto_trigger_thread
    
    data = request.get_json() or {}
    interval = data.get('interval', 60)
    
    if trigger_system.is_running:
        return jsonify({"success": False, "message": "Auto-trigger já está rodando"})
    
    auto_trigger_thread = threading.Thread(
        target=trigger_system.auto_trigger_timer,
        args=(interval,)
    )
    auto_trigger_thread.start()
    
    return jsonify({
        "success": True,
        "message": f"Auto-trigger iniciado com intervalo de {interval}s"
    })

@app.route('/auto-stop', methods=['POST'])
def stop_auto_trigger():
    """Parar auto-trigger"""
    trigger_system.stop_auto_trigger()
    return jsonify({
        "success": True,
        "message": "Auto-trigger parado"
    })

def example_usage():
    """Exemplos de como usar o sistema"""
    print("🚀 Exemplos de uso do Auto GET Nano Trigger")
    print("=" * 60)
    
    # Exemplo 1: Trigger manual via código
    print("1️⃣ Trigger manual via código Python:")
    trigger = AutoGetNanoTrigger()
    
    print("   # Acionar GET Nano 1")
    print("   result = trigger.trigger_get_nano('nano1', 'Teste manual')")
    result = trigger.trigger_get_nano("nano1", "Teste manual")
    print(f"   Resultado: {result.get('success', False)}")
    
    print("\n2️⃣ Exemplos de chamadas HTTP:")
    print("   # Trigger via HTTP POST")
    print("   curl -X POST http://localhost:5000/trigger/nano1 \\")
    print("        -H 'Content-Type: application/json' \\")
    print("        -d '{\"reason\": \"Teste via HTTP\"}'")
    
    print("\n   # Trigger ambos os nanos")
    print("   curl -X POST http://localhost:5000/trigger/both")
    
    print("\n   # Iniciar auto-trigger a cada 30 segundos")
    print("   curl -X POST http://localhost:5000/auto-start \\")
    print("        -H 'Content-Type: application/json' \\")
    print("        -d '{\"interval\": 30}'")
    
    print("\n3️⃣ Exemplo de integração com outros sistemas:")
    print("""
   # Sistema de monitoramento
   import requests
   
   def check_sensors():
       # Quando detectar evento, acionar GET Nano
       requests.post('http://localhost:5000/trigger/nano1', 
                     json={'reason': 'Sensor trigger'})
   
   # Sistema de agenda/cron
   def scheduled_task():
       # Executar GET a cada hora
       requests.post('http://localhost:5000/trigger/both',
                     json={'reason': 'Scheduled task'})
   """)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "server":
            print("🌐 Iniciando servidor web trigger na porta 5000...")
            print("📚 Acesse http://localhost:5000 para ver endpoints")
            app.run(host='0.0.0.0', port=5000, debug=True)
            
        elif sys.argv[1] == "auto":
            print("⏰ Iniciando auto-trigger com intervalo de 60s...")
            trigger = AutoGetNanoTrigger()
            try:
                trigger.auto_trigger_timer(60)
            except KeyboardInterrupt:
                print("\n🛑 Auto-trigger interrompido")
                
        elif sys.argv[1] == "test":
            print("🧪 Executando teste único...")
            trigger = AutoGetNanoTrigger()
            result1 = trigger.trigger_get_nano("nano1", "Teste único")
            time.sleep(3)
            result2 = trigger.trigger_get_nano("nano2", "Teste único")
            print(f"Nano 1: {result1.get('success')}")
            print(f"Nano 2: {result2.get('success')}")
    else:
        example_usage()
        print("\n" + "=" * 60)
        print("💡 Opções de execução:")
        print("   python3 auto_trigger.py server  # Servidor web")
        print("   python3 auto_trigger.py auto    # Auto-trigger contínuo") 
        print("   python3 auto_trigger.py test    # Teste único")