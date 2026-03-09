import requests
import json

url = "https://www.cartociudad.es/geocoder/api/geocoder/find"
parametros = {
    "q": "CALLE MADRE TERESA DE CALCUTA, Madrid",
    "type": "portal",
    "outSR": "4326"
}

r = requests.get(url, params=parametros)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print(json.dumps(r.json(), indent=2))
else:
    print(r.text)
