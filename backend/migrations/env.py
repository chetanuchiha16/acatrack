import logging
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from settings import settings
from database import Base

# Import all models so their tables are registered on Base.metadata
import models.schema  # noqa: F401

config = context.config

# Override sqlalchemy.url from settings
_raw_url = settings.database_url
if _raw_url.startswith("postgres://"):
    _sync_url = _raw_url.replace("postgres://", "postgresql://", 1)
elif _raw_url.startswith("postgresql+asyncpg://"):
    _sync_url = _raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
else:
    _sync_url = _raw_url

config.set_main_option("sqlalchemy.url", _sync_url)

fileConfig(config.config_file_name)
logger = logging.getLogger("alembic.env")

target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""

    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            process_revision_directives=process_revision_directives,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
