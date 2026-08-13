"""模型接入模块（SPE §6.5）。业务代码只经此模块调用 LLM。

职责：OpenAI 兼容客户端封装、超时与指数退避重试、强制 JSON 的 schema
校验与自动重问、文本/图像消息的统一构造。
"""
import json
import re
import time

from openai import OpenAI

from . import config

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=config.LLM_BASE_URL,
            api_key=config.LLM_API_KEY or "not-needed",
            timeout=config.LLM_TIMEOUT,
            max_retries=0,
        )
    return _client


def _extract_json(text):
    """从模型输出提取 JSON：直接解析 → 剥代码围栏 → 截取首尾大括号。"""
    text = (text or "").strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    i, j = text.find("{"), text.rfind("}")
    if i >= 0 and j > i:
        try:
            return json.loads(text[i:j + 1])
        except Exception:
            pass
    return None


def validate(obj, schema):
    """结构校验。schema = {field: type} 或 {field: {"type": T, "required": bool}}。"""
    if not isinstance(obj, dict):
        return False
    for k, spec in schema.items():
        required = True
        typ = spec if isinstance(spec, type) else spec.get("type")
        if isinstance(spec, dict):
            required = spec.get("required", True)
        if not required:
            continue
        if k not in obj or not isinstance(obj[k], typ):
            return False
    return True


def chat(messages, json_mode=False, schema=None, retries=2, temperature=None):
    """一次 LLM 调用（自动重试 2 次，指数退避）。

    json_mode=True 时：请求 JSON 输出（response_format 尽力而为，网关不支持
    自动降级），解析失败/不符 schema 时带错误自动重问一次。
    返回 (content_or_obj, raw)。
    """
    kwargs = dict(
        model=config.LLM_MODEL,
        messages=list(messages),
        temperature=config.LLM_TEMPERATURE if temperature is None else temperature,
        max_tokens=config.LLM_MAX_TOKENS,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last_err = None
    for attempt in range(retries + 1):
        try:
            resp = _get_client().chat.completions.create(**kwargs)
            content = (resp.choices[0].message.content or "").strip()
        except Exception as e:
            last_err = e
            msg = str(e)
            # 网关不支持 response_format 时降级为纯 prompt 约束
            if json_mode and "response_format" in msg:
                kwargs.pop("response_format", None)
            time.sleep(2 ** attempt * 2)
            continue

        if not json_mode:
            return content, None

        obj = _extract_json(content)
        if obj is not None and (schema is None or validate(obj, schema)):
            return obj, content

        if attempt == retries:
            return None, content
        kwargs["messages"] = list(messages) + [
            {"role": "assistant", "content": content},
            {"role": "user", "content": "你的输出不是合法 JSON 或不符合要求结构。请只输出符合要求的 JSON，不要任何解释。"},
        ]
    return None, str(last_err)


def vision_msg(text, image_url):
    """构造带图用户消息。LLM_SUPPORTS_VISION=false 时自动降级为纯文本（SPE §6.3-4）。"""
    if not config.LLM_SUPPORTS_VISION or not image_url:
        return {"role": "user", "content": text}
    return {"role": "user", "content": [
        {"type": "text", "text": text},
        {"type": "image_url", "image_url": {"url": image_url}},
    ]}
