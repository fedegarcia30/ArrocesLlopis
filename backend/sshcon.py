import sshtunnel
import os
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

sshtunnel.SSH_TIMEOUT = 10.0
sshtunnel.TUNNEL_TIMEOUT = 10.0

ssh_host = os.environ.get('SSH_REMOTE_HOST', 'ssh.eu.pythonanywhere.com')
ssh_user = os.environ.get('SSH_USERNAME')
ssh_pass = os.environ.get('SSH_PASSWORD')
db_host = os.environ.get('MYSQL_HOST')
db_user = os.environ.get('MYSQL_USER')
db_pass = os.environ.get('MYSQL_PASSWORD')
db_name = os.environ.get('MYSQL_DATABASE')

print(f"Connecting to {ssh_host} as {ssh_user}...")

with sshtunnel.SSHTunnelForwarder(
    (ssh_host, 22),
    ssh_username=ssh_user,
    ssh_password=ssh_pass,
    remote_bind_address=(db_host, 3306),
    local_bind_address=('127.0.0.1', 3307)
) as tunnel:
    print(f"Tunnel established! Connecting to DB {db_name} via local port {tunnel.local_bind_port}...")

