# backend/cache_config.py
"""
Lightweight caching utility using redis-py directly.

Provides a `@cache(expire=N)` decorator for FastAPI endpoints,
compatible with redis>=7.x.

Usage in routers:
    from cache_config import cache

    @router.get("/...")
    @cache(expire=3600)
    async def my_endpoint(...):
        ...
"""

from __future__ import annotations

import functools
import hashlib
import pickle
from typing import Any, Callable

from redis import asyncio as aioredis
from settings import settings
from logger_config import get_logger

logger = get_logger(__name__)

_redis_client: aioredis.Redis | None = None
_cache_enabled = True


async def init_cache() -> None:
    """Initialise the Redis cache client. Call during app lifespan startup."""
    global _redis_client, _cache_enabled

    if getattr(settings, "testing", False):
        _cache_enabled = False
        logger.info("Cache disabled in testing mode")
        return

    try:
        _redis_client = aioredis.from_url(
            settings.redis_url,
        )
        await _redis_client.ping()
        logger.info("Redis cache connected")
    except Exception as e:
        logger.warning(f"Redis unavailable, caching disabled: {e}")
        _redis_client = None
        _cache_enabled = False


def _is_injectable(obj: Any) -> bool:
    """Return True for DI objects that must NOT appear in cache keys."""
    # SQLAlchemy sessions (async or sync)
    if hasattr(obj, "execute") and hasattr(obj, "commit"):
        return True
    return False


def _make_key(prefix: str, args: tuple, kwargs: dict) -> str:
    """Generate a deterministic cache key from function args.

    Skips non-serializable dependency-injected objects (AsyncSession, etc.)
    so the same logical request always maps to the same cache key.
    """
    key_parts: list[str] = []
    for a in args:
        if _is_injectable(a):
            continue
        if hasattr(a, "url"):  # FastAPI Request – use URL only
            key_parts.append(str(a.url))
        else:
            key_parts.append(str(a))
    for k, v in sorted(kwargs.items()):
        if k == "db" or _is_injectable(v):
            continue
        if hasattr(v, "url"):
            key_parts.append(f"{k}={v.url}")
        else:
            key_parts.append(f"{k}={v}")

    raw = ":".join(key_parts)
    hashed = hashlib.md5(raw.encode()).hexdigest()
    return f"acat:v2:{prefix}:{hashed}"


def cache(expire: int = 3600) -> Callable:
    """
    Decorator that caches the JSON-serializable response of an async endpoint.

    @cache(expire=3600)
    async def my_endpoint(...):
        return {"data": ...}
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            if not _cache_enabled or not _redis_client:
                return await func(*args, **kwargs)

            key = _make_key(func.__name__, args, kwargs)

            try:
                cached = await _redis_client.get(key)
                if cached is not None:
                    payload = pickle.loads(cached)
                    if isinstance(payload, dict) and payload.get("is_response"):
                        from fastapi.responses import Response

                        return Response(
                            content=payload["body"],
                            status_code=payload.get("status_code", 200),
                            headers=payload.get("headers", {}),
                            media_type=payload["media_type"],
                        )
                    return payload
            except Exception as e:
                logger.error(f"Cache retrieve error: {e}")
                pass  # Redis failure → proceed without cache

            result = await func(*args, **kwargs)

            try:
                if isinstance(result, (dict, list)):
                    await _redis_client.setex(key, expire, pickle.dumps(result))
                elif hasattr(result, "body") and hasattr(result, "media_type"):
                    cache_payload = {
                        "is_response": True,
                        "body": result.body,
                        "media_type": result.media_type,
                        "headers": dict(result.headers),
                        "status_code": result.status_code,
                    }
                    await _redis_client.setex(key, expire, pickle.dumps(cache_payload))
            except Exception as e:
                logger.error(f"Failed to cache response: {e}")
                pass  # Redis failure → don't break the endpoint

            return result

        return wrapper

    return decorator
