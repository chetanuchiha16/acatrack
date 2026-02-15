import socket
from logger_config import get_logger

logger = get_logger(__name__)

logger.debug(socket.getaddrinfo("db.hpavqkjevepfegkojisn.supabase.co", 5432))
