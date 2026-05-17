import logging

logging.basicConfig(
    level=logging.DEBUG,  # Switch to INFO or WARNING in production
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)


def get_logger(name):
    # Silence noisy external libraries if root level is DEBUG
    logging.getLogger("matplotlib").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("hpack").setLevel(logging.WARNING)
    return logging.getLogger(name)
