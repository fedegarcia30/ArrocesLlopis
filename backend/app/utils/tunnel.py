import os
from sshtunnel import SSHTunnelForwarder
from app.utils.logger import logger

_tunnel = None

def start_tunnel():
    global _tunnel
    
    if os.environ.get('USE_SSH_TUNNEL') != 'True':
        return None

    ssh_host = os.environ.get('SSH_REMOTE_HOST', 'ssh.eu.pythonanywhere.com')
    ssh_user = os.environ.get('SSH_USERNAME')
    ssh_pass = os.environ.get('SSH_PASSWORD')
    remote_db_host = os.environ.get('MYSQL_HOST', 'mysql.eu.pythonanywhere-services.com')
    remote_db_port = 3306

    if not ssh_user or not ssh_pass:
        logger.warning("SSH Tunnel requested but SSH_USERNAME or SSH_PASSWORD missing in .env")
        return None

    try:
        logger.info(f"Establishing SSH Tunnel to {ssh_host} for {ssh_user}...")
        
        # Enable trace internal logging for troubleshooting
        import logging
        logging.getLogger('sshtunnel').setLevel(logging.DEBUG)
        
        _tunnel = SSHTunnelForwarder(
            (ssh_host, 22),
            ssh_username=ssh_user,
            ssh_password=ssh_pass,
            remote_bind_address=(remote_db_host, remote_db_port),
            local_bind_address=('127.0.0.1', 3307),
            set_keepalive=30,
            ssh_config_file=None  # Avoid using local ~/.ssh/config which might conflict
        )
        _tunnel.start()
        logger.info(f"SSH Tunnel established: 127.0.0.1:3307 -> {remote_db_host}:{remote_db_port}")
        return _tunnel
    except Exception as e:
        logger.error(f"Failed to establish SSH Tunnel: {str(e)}")
        _tunnel = None
        return None

def stop_tunnel():
    global _tunnel
    if _tunnel:
        logger.info("Closing SSH Tunnel...")
        _tunnel.stop()
        _tunnel = None

def get_tunnel_db_url(base_url):
    """
    Adjusts the database URL to use the local tunnel port if active.
    """
    if _tunnel and _tunnel.is_active:
        # Example: mysql+pymysql://user:pass@mysql.eu.../db 
        # -> mysql+pymysql://user:pass@127.0.0.1:3307/db
        import re
        # This regex replaces the host:port part with 127.0.0.1:3307
        # It looks for anything after '@' and before the first '/'
        return re.sub(r'@([^/]+)/', f'@127.0.0.1:3307/', base_url)
    return base_url
