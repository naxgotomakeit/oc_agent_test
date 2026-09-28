import json
import base64
import binascii
import hashlib
import hmac
import logging
import os
import secrets
import time
from pathlib import Path
from typing import Literal

from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import yaml

from app.profile import build_system_prompt, load_profile


ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
load_dotenv(ROOT / ".env")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent_web")

app = FastAPI(title="Bruce · Local Agent Prototype", docs_url="/api/docs")
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")
ACCESS_CODE = os.getenv("TEAM_ACCESS_CODE", "").strip()
SESSION_SECRET = os.getenv("SESSION_SECRET", "local-only-development-secret").encode()
SESSION_COOKIE = "bruce_team_session"
SESSION_TTL_SECONDS = 12 * 60 * 60
APP_ENV = os.getenv("APP_ENV", "local").lower()
if APP_ENV == "production" and not ACCESS_CODE:
    raise RuntimeError("TEAM_ACCESS_CODE is required in production.")
if ACCESS_CODE and (
    SESSION_SECRET == b"local-only-development-secret" or len(SESSION_SECRET) < 32
):
    raise RuntimeError("Set a private SESSION_SECRET of at least 32 characters when TEAM_ACCESS_CODE is enabled.")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=6000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)
    memories: list[str] = Field(default_factory=list, max_length=30)


class LoginRequest(BaseModel):
    access_code: str = Field(min_length=1, max_length=200)


def create_session_token() -> str:
    payload = f"{int(time.time())}.{secrets.token_urlsafe(18)}"
    signature = hmac.new(SESSION_SECRET, payload.encode(), hashlib.sha256).hexdigest()
    encoded_payload = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return f"{encoded_payload}.{signature}"


def has_valid_session(request: Request) -> bool:
    if not ACCESS_CODE:
        return True
    token = request.cookies.get(SESSION_COOKIE, "")
    if not token:
        return False
    try:
        encoded_payload, supplied_signature = token.split(".", 1)
        padded = encoded_payload + "=" * (-len(encoded_payload) % 4)
        payload = base64.urlsafe_b64decode(padded.encode())
        expected_signature = hmac.new(SESSION_SECRET, payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(supplied_signature, expected_signature):
            return False
        issued_at_text, _nonce = payload.decode().split(".", 1)
        age = int(time.time()) - int(issued_at_text)
        return 0 <= age < SESSION_TTL_SECONDS
    except (ValueError, UnicodeDecodeError, binascii.Error):
        return False


def require_team_access(request: Request) -> None:
    if not has_valid_session(request):
        raise HTTPException(status_code=401, detail="请先输入团队访问码。")


@app.get("/", include_in_schema=False)
async def home() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "profile": "Bruce"}


@app.get("/api/v1/session")
async def session_status(request: Request) -> dict[str, bool]:
    required = bool(ACCESS_CODE)
    return {"access_required": required, "authenticated": has_valid_session(request)}


@app.post("/api/v1/login")
async def login(payload: LoginRequest, request: Request, response: Response) -> dict[str, bool]:
    if ACCESS_CODE and not secrets.compare_digest(payload.access_code, ACCESS_CODE):
        raise HTTPException(status_code=401, detail="访问码不正确，请再试一次。")
    if ACCESS_CODE:
        response.set_cookie(
            key=SESSION_COOKIE,
            value=create_session_token(),
            max_age=SESSION_TTL_SECONDS,
            httponly=True,
            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
            samesite="strict",
            path="/",
        )
    return {"authenticated": True}


@app.post("/api/v1/logout")
async def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="strict")
    return {"authenticated": False}


@app.post("/api/v1/chat")
async def chat(request: ChatRequest, http_request: Request) -> StreamingResponse:
    require_team_access(http_request)
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key or api_key == "replace-with-your-api-key":
        raise HTTPException(
            status_code=503,
            detail="Claude 尚未配置。请在项目根目录的 .env 文件中填入 API Key。",
        )

    try:
        profile = load_profile()
        if any(len(memory) > 500 for memory in request.memories):
            raise HTTPException(status_code=422, detail="单条记忆不能超过 500 个字符。")
        system_prompt = build_system_prompt(profile, request.memories)
    except HTTPException:
        raise
    except (OSError, ValueError, yaml.YAMLError) as exc:
        logger.error("Unable to load agent profile (%s)", type(exc).__name__)
        raise HTTPException(status_code=500, detail="角色设定暂时无法读取。") from exc

    client = AsyncAnthropic(api_key=api_key, max_retries=0, timeout=90.0)
    model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    conversation = [message.model_dump() for message in request.messages[-20:]]

    async def events():
        try:
            async with client.messages.stream(
                model=model,
                max_tokens=900,
                system=system_prompt,
                messages=conversation,
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # Provider errors are kept out of the browser response.
            logger.error("Model request failed (%s)", type(exc).__name__)
            yield f"data: {json.dumps({'error': 'Claude 请求失败，请检查网络、API Key 和账户额度。'}, ensure_ascii=False)}\n\n"
        finally:
            await client.close()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
