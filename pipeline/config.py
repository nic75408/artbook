"""配置集中处（SPE §6.5）。换模型底座只改这里或环境变量，不动业务代码。"""
import os
from pathlib import Path

# --- 目录 ---
ROOT = Path(__file__).resolve().parent.parent        # 仓库根
DATA = ROOT / "data"
ISSUES = DATA / "issues"
PIPELINE_DIR = ROOT / "pipeline"

# --- LLM（换底座只改这里；环境变量优先） ---
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://lboneapi.longbridge-inc.com/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "qwen3.5-plus")
LLM_SUPPORTS_VISION = os.environ.get("LLM_SUPPORTS_VISION", "true").lower() in ("1", "true", "yes")
LLM_TEMPERATURE = float(os.environ.get("LLM_TEMPERATURE", "0.6"))
LLM_MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "4000"))
LLM_TIMEOUT = 180

# --- 数据源 ---
MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1"
AIC_BASE = "https://api.artic.edu/api/v1"
CMA_BASE = "https://openaccess-api.clevelandart.org/api"
RIJKS_BASE = "https://www.rijksmuseum.nl/api/en"
RIJKS_API_KEY = os.environ.get("RIJKS_API_KEY", "")

# --- 候选配额（默认配比；源失败由其余源补足） ---
CANDIDATE_TARGET = 100
SOURCE_QUOTA = {"met": 50, "aic": 30, "cma": 20}

# --- 请求礼仪（SPE §6.2 硬性） ---
REQUEST_INTERVAL = 0.15       # 每请求间隔 >= 150ms
RETRY_TIMES = 3               # 429/5xx 指数退避重试
HTTP_TIMEOUT = 30

# --- 期 ---
WORKS_PER_ISSUE = 30
MIN_WORKS = 20                # <20 整期失败
PAINTING_RATIO = 0.70         # 绘画类占比 >= 70%
MAX_PER_ARTIST_POOL = 4       # 候选池内同画家上限
MAX_PER_ARTIST_ISSUE = 2      # 期内同画家上限

# --- 分类白名单（各源措辞不同，适配器内做包含匹配） ---
CLASSIFICATION_WHITELIST = ("painting", "drawing", "watercolor", "print", "pastel", "tempera", "oil")
PAINTING_CLASSES = ("painting", "oil", "tempera")


def _load_env_file():
    """最小 .env 加载（不引入 python-dotenv；已存在的环境变量优先）。
    依次尝试 仓库根/.env、仓库上一级/.env（本地开发 key 存放处）。"""
    for p in (ROOT / ".env", ROOT.parent / ".env"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


_load_env_file()
LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
