#!/usr/bin/env python3
"""
Cliente exemplo para consumir a API do GET Nano
Demonstra como outros serviços podem integrar com o sistema
"""

import requests
import json
import time
from datetime import datetime

class GetNanoClient:
    def __init__(self, api_base_url="http://localhost:3001"):
        self.api_base_url = api_base_url
        self.session = requests.Session()
    
    def check_api_status(self):
        """Verificar status da API e dos Arduino Nanos"""
        try:
            response = self.session.get(f"{self.api_base_url}/status")
            if response.status_code == 200:
                return response.json()
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def execute_get_nano(self, nano="nano1", timeout=10, payload=None):
        """
        Executar comando GET em Arduino Nano específico
        
        Args:
            nano (str): 'nano1' ou 'nano2'
            timeout (int): Timeout em segundos
            payload (dict): Dados adicionais opcionais
        """
        try:
            data = {
                "timeout": timeout * 1000,  # API espera em ms
                "payload": payload
            }
            
            response = self.session.post(
                f"{self.api_base_url}/get-nano/{nano}", 
                json=data,
                timeout=timeout + 5  # Timeout do requests maior que da API
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "success": False, 
                    "error": f"HTTP {response.status_code}",
                    "response": response.text
                }
                
        except requests.exceptions.Timeout:
            return {"success": False, "error": "Timeout na requisição"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_last_response(self, nano="nano1"):
        """Obter última resposta de um Arduino Nano"""
        try:
            response = self.session.get(f"{self.api_base_url}/get-nano/{nano}/last")
            if response.status_code == 200:
                return response.json()
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def list_logs(self):
        """Listar logs disponíveis"""
        try:
            response = self.session.get(f"{self.api_base_url}/logs")
            if response.status_code == 200:
                return response.json()
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def download_log(self, filename):
        """Baixar log específico"""
        try:
            response = self.session.get(f"{self.api_base_url}/logs/{filename}")
            if response.status_code == 200:
                return response.json()
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

def example_usage():
    """Exemplo de uso do cliente"""
    print("🚀 Exemplo de uso do Cliente GET Nano API")
    print("=" * 50)
    
    # Criar cliente
    client = GetNanoClient()
    
    # 1. Verificar status da API
    print("1️⃣ Verificando status da API...")
    status = client.check_api_status()
    print(f"Status: {json.dumps(status, indent=2)}")
    
    if not status.get("success", False):
        print("❌ API não está disponível")
        return
    
    # 2. Verificar se os Arduino Nanos estão conectados
    nanos_status = status.get("nanos", {})
    nano1_connected = nanos_status.get("nano1", {}).get("connected", False)
    nano2_connected = nanos_status.get("nano2", {}).get("connected", False)
    
    print(f"📡 Nano 1 conectado: {nano1_connected}")
    print(f"📡 Nano 2 conectado: {nano2_connected}")
    
    if not (nano1_connected or nano2_connected):
        print("⚠️ Nenhum Arduino Nano conectado")
        return
    
    # 3. Executar comando GET no Nano 1 (se conectado)
    if nano1_connected:
        print("\n2️⃣ Executando GET no Nano 1...")
        result = client.execute_get_nano("nano1", timeout=15)
        print(f"Resultado Nano 1: {json.dumps(result, indent=2)}")
        
        if result.get("success"):
            print(f"✅ Dados recebidos do Nano 1: {result.get('data', '')}")
        else:
            print(f"❌ Erro no Nano 1: {result.get('error', 'Desconhecido')}")
    
    # 4. Executar comando GET no Nano 2 (se conectado)
    if nano2_connected:
        print("\n3️⃣ Executando GET no Nano 2...")
        result = client.execute_get_nano("nano2", timeout=15)
        print(f"Resultado Nano 2: {json.dumps(result, indent=2)}")
        
        if result.get("success"):
            print(f"✅ Dados recebidos do Nano 2: {result.get('data', '')}")
        else:
            print(f"❌ Erro no Nano 2: {result.get('error', 'Desconhecido')}")
    
    # 5. Obter última resposta
    print("\n4️⃣ Obtendo última resposta do Nano 1...")
    last_response = client.get_last_response("nano1")
    print(f"Última resposta: {json.dumps(last_response, indent=2)}")
    
    # 6. Listar logs disponíveis
    print("\n5️⃣ Listando logs disponíveis...")
    logs = client.list_logs()
    if logs.get("success") and logs.get("logs"):
        print(f"📁 {len(logs['logs'])} logs encontrados:")
        for log in logs["logs"][:3]:  # Mostrar apenas os 3 primeiros
            print(f"   - {log['filename']} ({log['entries']} entradas)")
    else:
        print("📁 Nenhum log encontrado")

def continuous_monitoring():
    """Exemplo de monitoramento contínuo"""
    print("🔄 Iniciando monitoramento contínuo...")
    print("Pressione Ctrl+C para parar")
    
    client = GetNanoClient()
    
    try:
        while True:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"\n[{timestamp}] Executando GET nos Arduino Nanos...")
            
            # Verificar status
            status = client.check_api_status()
            if not status.get("success"):
                print("❌ API não disponível")
                time.sleep(10)
                continue
            
            nanos = status.get("nanos", {})
            
            # GET Nano 1
            if nanos.get("nano1", {}).get("connected"):
                result1 = client.execute_get_nano("nano1", timeout=10)
                if result1.get("success"):
                    data = result1.get("data", "")[:50]  # Primeiros 50 chars
                    print(f"✅ Nano 1: {data}...")
                else:
                    print(f"❌ Nano 1: {result1.get('error', 'Erro')}")
            
            # GET Nano 2
            if nanos.get("nano2", {}).get("connected"):
                result2 = client.execute_get_nano("nano2", timeout=10)
                if result2.get("success"):
                    data = result2.get("data", "")[:50]  # Primeiros 50 chars
                    print(f"✅ Nano 2: {data}...")
                else:
                    print(f"❌ Nano 2: {result2.get('error', 'Erro')}")
            
            # Aguardar 30 segundos
            time.sleep(30)
            
    except KeyboardInterrupt:
        print("\n🛑 Monitoramento interrompido pelo usuário")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "monitor":
        continuous_monitoring()
    else:
        example_usage()
        
        print("\n" + "=" * 50)
        print("💡 Dica: Execute 'python3 get_nano_client.py monitor' para monitoramento contínuo")
        print("📚 Documentação da API: http://localhost:3001")