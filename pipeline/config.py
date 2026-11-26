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
# 2026-11-21 实测：qwen3.5-plus 网关当前带图调用单次延迟可达 140-150s
# （纯文本调用仅 4s），180s 超时常把本可成功的慢调用杀死后重试，
# 白白耗时且不提高成功率。调到 300s 给慢调用留出完成空间。
LLM_TIMEOUT = int(os.environ.get("LLM_TIMEOUT", "300"))

# --- 数据源 ---
# 2026-11-27：Met 于 2026-10-01 停用 v1 搜索接口（返回 410，body 里的
# replacement 字段指向 v1.1/search）。v1.1 是 Elastic 支持，分页用
# offset+limit（而非 v1 的返回全量 objectIDs 数组）。单件详情接口仍是
# v1（实测 200 正常），所以搜索与详情分成两个 BASE。
MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1"
# 2026-11-21：/v1/search 已于 2026-10-01 退役（410 Gone，Solr→Elastic 迁移），
# 官方指定替代端点 /v1.1/search；/v1/objects、/v1/objects/{id} 等其余端点不受影响，
# 仍用 MET_BASE。见 met.py _search()。
MET_SEARCH_BASE = "https://collectionapi.metmuseum.org/public/collection/v1.1"
AIC_BASE = "https://api.artic.edu/api/v1"
CMA_BASE = "https://openaccess-api.clevelandart.org/api"
RIJKS_BASE = "https://www.rijksmuseum.nl/api/en"
RIJKS_API_KEY = os.environ.get("RIJKS_API_KEY", "")

# --- 候选配额（默认配比；源失败由其余源补足） ---
# 2026-11-27：AIC 被 Cloudflare 人机验证拦死（403，改 header 绕不过），
# 把原 30 个名额转给 Met（+20）和 CMA（+10），AIC 配额归零——
# 自动跳过逻辑（aic.py）保留，配额为 0 时 generate.fetch_candidates 直接跳过该源。
CANDIDATE_TARGET = 100
SOURCE_QUOTA = {"met": 70, "aic": 0, "cma": 30}

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

# --- 图片比例闸门（t_d6f39a82：中国立轴/手卷 h/w 常超 10，旧上限 10 误拦） ---
# t_03383a4f：AIC 403 期间 CMA 独自供给候选，CMA 藏品中大量中国手卷/长卷
# （宽远大于高，如"长江万里图" 900×23 → ratio≈0.026）被旧下限 0.1 误拦，
# 连续 3 天拦截超半数候选导致整期失败。手卷是合法艺术品，不是脏数据，
# 下限放宽到 0.02（覆盖 h/w 低至 1:50 的极端横幅)。
MIN_IMAGE_RATIO = 0.02        # 极端横幅下限（原 0.1 → 0.02）
MAX_IMAGE_RATIO = 30          # 覆盖最极端的中国立轴画（原 10 → 30）

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
