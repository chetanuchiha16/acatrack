import functools
import hashlib
import pickle
import orjson
from typing import Any, Callable
from fastapi import Response
from redis import asyncio as aioredis
from settings import settings
from logger_config import get_logger

logger = get_logger(__name__)

_redis_client: aioredis.Redis | None = None
_cache_enabled = True


async def init_cache() -> None:
    global _redis_client, _cache_enabled
    if getattr(settings, "testing", False):
        _cache_enabled = False
        return
    try:
        _redis_client = aioredis.from_url(settings.redis_url)
        await _redis_client.ping()
        logger.info("Redis cache connected")
    except Exception as e:
        logger.warning(f"Redis unavailable: {e}")
        _redis_client = None
        _cache_enabled = False


def _make_key(prefix: str, args: tuple, kwargs: dict) -> str:
    key_parts: list[str] = []
    for a in args:
        if hasattr(a, "execute") and hasattr(a, "commit"):
            continue  # Session
        if hasattr(a, "url"):
            key_parts.append(str(a.url))
        else:
            key_parts.append(str(a))
    for k, v in sorted(kwargs.items()):
        if k == "db" or (hasattr(v, "execute") and hasattr(v, "commit")):
            continue
        if hasattr(v, "url"):
            key_parts.append(f"{k}={v.url}")
        else:
            key_parts.append(f"{k}={v}")

    raw = ":".join(key_parts)
    hashed = hashlib.md5(raw.encode()).hexdigest()
    return f"acat:v3:{prefix}:{hashed}"


def _parse_cached(cached: bytes):
    """Parse the binary cache format: [TYPE:1][STATUS:3][MT_LEN:1][MT][BODY]"""
    type_byte = cached[0:1]
    status_code = int(cached[1:4])
    mt_len = cached[4]
    media_type = cached[5 : 5 + mt_len].decode()
    body = cached[5 + mt_len :]

    if type_byte in (b"J", b"R"):
        # J = JSON, R = Raw Response (PDF, image, etc.) — both served directly
        return Response(content=body, status_code=status_code, media_type=media_type)
    else:
        # P = Pickle (fallback for non-Response Python objects)
        return pickle.loads(body)


def cache(expire: int = 3600) -> Callable:
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            import asyncio

            if not _cache_enabled or not _redis_client:
                return await func(*args, **kwargs)

            key = _make_key(func.__name__, args, kwargs)
            lock_key = f"{key}:lock"

            # 1. Fast Path: cache hit
            try:
                cached = await _redis_client.get(key)
                if cached:
                    return _parse_cached(cached)
            except Exception as e:
                logger.error(f"Cache hit error: {e}")

            # 2. Slow Path: Lock & Compute
            try:
                acquired = await _redis_client.set(lock_key, "1", nx=True, ex=30)
            except Exception:
                acquired = True

            if not acquired:
                for _ in range(200):  # 4 seconds
                    await asyncio.sleep(0.02)
                    try:
                        cached = await _redis_client.get(key)
                        if cached:
                            return _parse_cached(cached)
                    except Exception:
                        pass

            try:
                result = await func(*args, **kwargs)
            finally:
                try:
                    await _redis_client.delete(lock_key)
                except Exception:
                    pass

            # 3. Store in Redis
            try:
                status_code = 200
                media_type = "application/json"

                if isinstance(result, Response):
                    body = result.body
                    status_code = result.status_code
                    media_type = result.media_type or "application/octet-stream"
                    # J for JSON responses, R for raw (PDF, image, etc.)
                    type_byte = b"J" if "json" in media_type.lower() else b"R"
                elif isinstance(result, (dict, list)):
                    body = orjson.dumps(result)
                    type_byte = b"J"
                else:
                    body = pickle.dumps(result)
                    type_byte = b"P"

                st_code_bytes = f"{status_code:03d}".encode()
                mt_bytes = media_type.encode()
                mt_len_byte = bytes([len(mt_bytes)])

                final_payload = (
                    type_byte + st_code_bytes + mt_len_byte + mt_bytes + body
                )
                await _redis_client.setex(key, expire, final_payload)
            except Exception as e:
                logger.error(f"Cache store error: {e}")

            return result

        return wrapper

    return decorator
