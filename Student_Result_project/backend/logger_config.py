import logging

logging.basicConfig(
    level=logging.DEBUG,  # Switch to INFO or WARNING in production
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)


def get_logger(name):
    return logging.getLogger(name)
