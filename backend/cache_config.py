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
import json
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
            encoding="utf-8",
            decode_responses=True,
        )
        await _redis_client.ping()
        logger.info("Redis cache connected")
    except Exception as e:
        logger.warning(f"Redis unavailable, caching disabled: {e}")
        _redis_client = None
        _cache_enabled = False


def _make_key(prefix: str, args: tuple, kwargs: dict) -> str:
    """Generate a deterministic cache key from function args."""
    # Serialize args (skip 'request' objects)
    key_parts = []
    for a in args:
        if hasattr(a, "url"):  # FastAPI Request object
            key_parts.append(str(a.url))
        else:
            key_parts.append(str(a))
    for k, v in sorted(kwargs.items()):
        if hasattr(v, "url"):
            key_parts.append(f"{k}={v.url}")
        else:
            key_parts.append(f"{k}={v}")

    raw = ":".join(key_parts)
    hashed = hashlib.md5(raw.encode()).hexdigest()
    return f"acatrack:{prefix}:{hashed}"


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
                    payload = json.loads(cached)
                    # If payload is a dictionary and contains specific Response keys, reconstruct it
                    if isinstance(payload, dict) and "body" in payload and "media_type" in payload:
                        from fastapi.responses import Response
                        return Response(
                            content=payload["body"].encode("latin1"),
                            status_code=payload.get("status_code", 200),
                            headers=payload.get("headers", {}),
                            media_type=payload["media_type"]
                        )
                    return payload
            except Exception as e:
                logger.error(f"Cache retrieve error: {e}")
                pass  # Redis failure → proceed without cache

            result = await func(*args, **kwargs)

            try:
                if isinstance(result, (dict, list)):
                    await _redis_client.setex(key, expire, json.dumps(result, default=str))
                elif hasattr(result, "body") and hasattr(result, "media_type"):
                    # Cache raw Response outputs like JSONResponse or custom PDF Responses
                    cache_payload = {
                        "body": result.body.decode("latin1"),
                        "media_type": result.media_type,
                        "headers": dict(result.headers),
                        "status_code": result.status_code,
                    }
                    await _redis_client.setex(key, expire, json.dumps(cache_payload, default=str))
            except Exception as e:
                logger.error(f"Failed to cache response: {e}")
                pass  # Redis failure → don't break the endpoint

            return result
        return wrapper
    return decorator
