import requests
import json
import uuid

BASE_URL = "http://localhost:5001/api/v1"
HEADERS = {
    "Authorization": "Bearer DEV_BYPASS_TOKEN",
    "Content-Type": "application/json"
}

def check_client(client_id):
    resp = requests.get(f"{BASE_URL}/clients", headers=HEADERS)
    clients = resp.json().get('clients', [])
    for c in clients:
        if c['id'] == client_id:
            return c
    return None

def test_sync():
    print("--- Starting Sync Verification ---")
    
    # 1. Create client
    phone = str(uuid.uuid4().int)[:9]
    client_name = f"Test Sync {phone}"
    
    # We don't have a direct create client endpoint in the simplified version, 
    # but order creation auto-creates if id is missing.
    
    # 2. Create Order
    print(f"1. Creating order for new client...")
    order_data = {
        "date": "2026-06-20",
        "time": "13:30",
        "client": {
            "nombre": client_name,
            "telefono": phone,
            "direccion": "Calle Test 123",
            "codigo_postal": "46000"
        },
        "order": {
            "pax": 4,
            "arroz_id": 1,
            "recogida": True,
            "observaciones": "Test sync"
        }
    }
    
    resp = requests.post(f"{BASE_URL}/orders/create", json=order_data, headers=HEADERS)
    if resp.status_code != 201:
        print(f"FAILED to create order: {resp.text}")
        return
    
    order_id = resp.json()['order_id']
    
    # Find client_id
    resp_clients = requests.get(f"{BASE_URL}/clients?search={phone}", headers=HEADERS)
    client = resp_clients.json()['clients'][0]
    client_id = client['id']
    
    print(f"   Order created: #{order_id}, Client: #{client_id}")
    print(f"   Stats: num_pedidos={client['num_pedidos']}, raciones={client.get('raciones', 'N/A')}")
    
    if client['num_pedidos'] != 1:
        print("   ERR: num_pedidos should be 1")
    
    # 3. Update Pax
    print("2. Updating PAX from 4 to 6...")
    resp = requests.patch(f"{BASE_URL}/pedidos/{order_id}", json={"pax": 6}, headers=HEADERS)
    
    client = check_client(client_id)
    print(f"   New stats: num_pedidos={client['num_pedidos']}, raciones={client.get('raciones', 'N/A')}")
    # Note: Backend might not return 'raciones' in serialize_client unless updated.
    
    # 4. Cancel Order
    print("3. Cancelling order...")
    requests.patch(f"{BASE_URL}/pedidos/{order_id}/status", json={"status": "cancelado"}, headers=HEADERS)
    client = check_client(client_id)
    print(f"   Stats after cancel: num_pedidos={client['num_pedidos']}, raciones={client.get('raciones', 'N/A')}")

    # 5. Restore Order
    print("4. Restoring order...")
    requests.patch(f"{BASE_URL}/pedidos/{order_id}/status", json={"status": "nuevo"}, headers=HEADERS)
    client = check_client(client_id)
    print(f"   Stats after restore: num_pedidos={client['num_pedidos']}, raciones={client.get('raciones', 'N/A')}")

if __name__ == "__main__":
    try:
        test_sync()
    except Exception as e:
        print(f"Error connecting to API: {e}. Is the server running?")
