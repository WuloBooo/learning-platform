#!/usr/bin/env bash
# build.sh —— JupyterLite 三级练习站点服务器端一键构建脚本（幂等）
#
# 职责（PRD F5 / T-3）：
#   1. 自动探测 Python >= 3.10（T-3.1 / AC10）：python3.12 > 3.11 > 3.10 > python3
#   2. 创建独立 venv（不污染系统 Python，不影响 Node 服务，AC15）
#   3. 安装 jupyterlite + jupytext + nbformat + jupyter-server + zh-CN 语言包（T-3.2 / T-2）
#   4. 运行 convert.py（zip -> ipynb，幂等；源缺失则跳过，T-3.3 / AC12）
#   5. 废弃 首页.ipynb（B5 / AC14）
#   6. jupyter lite build 生成 _output/（幂等，AC13）
#   7. 覆写 _output/index.html 为自定义中文导航首页（T-1 / AC1 / B7）
#
# 使用：在服务器上 `bash build.sh`
#
# 目录布局：本目录位于学习平台项目根下（学习平台/jupyterlite/），
# 与 server/src/index.js 中 JUPYTER_OUTPUT_DIR = '../../jupyterlite/_output' 对应（AC1 一致性）。
# 构建产物 _output/ 由 Express 静态托管到 /jupyter/。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 源 zip 目录（可在调用前用环境变量覆盖）
SRC_DIR="${SRC_DIR:-$HOME/Desktop/线下实操练习/三级}"

echo "========================================"
echo " JupyterLite 三级练习站点构建"
echo "========================================"

# ----------------------------------------------------------
# 1. 探测 Python（T-3.1 / AC10 / TC11）
#    优先级：环境变量 PYTHON_BIN > python3.12 > python3.11 > python3.10 > python3
#    版本需 >= 3.10；不再写死 python3.12。
# ----------------------------------------------------------
if [ -z "${PYTHON_BIN:-}" ]; then
  for cand in python3.12 python3.11 python3.10 python3; do
    if command -v "$cand" >/dev/null 2>&1; then
      # 校验次版本号 >= 3.10（python3 可能是 3.9）
      minor="$("$cand" -c 'import sys; print(sys.version_info[1])' 2>/dev/null || echo 0)"
      if [ "${minor:-0}" -ge 10 ] 2>/dev/null; then
        PYTHON_BIN="$cand"
        break
      fi
    fi
  done
fi

if [ -z "${PYTHON_BIN:-}" ] || ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "❌ 未找到 Python >= 3.10。请先安装 Python 3.10/3.11/3.12："
  echo "   Ubuntu/Debian (deadsnakes):"
  echo "     sudo add-apt-repository ppa:deadsnakes/ppa -y"
  echo "     sudo apt-get update && sudo apt-get install -y python3.12 python3.12-venv"
  echo "   macOS (homebrew):  brew install python@3.12"
  echo "   或源码编译：https://www.python.org/downloads/"
  echo "   也可用 PYTHON_BIN=/path/to/python3.10 bash build.sh 显式指定。"
  exit 1
fi

PY_VER="$($PYTHON_BIN --version)"
echo "✅ 使用 $PY_VER ($PYTHON_BIN)"

# ----------------------------------------------------------
# 2. 独立 venv（幂等：存在则复用）
# ----------------------------------------------------------
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "🔧 创建 venv: $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "⬆️ 升级 pip ..."
python -m pip install --upgrade pip --quiet

# ----------------------------------------------------------
# 3. 安装构建依赖（幂等）
#    T-3.2 / AC11：补 jupyter-server（现状缺，build 报
#    "RuntimeError: jupyter-server is not installed"）。
#    T-2：安装 zh-CN 语言包（notebook 7 基于 jlab 4，语言包通用）。
# ----------------------------------------------------------
echo "📦 安装 jupyterlite / jupytext / nbformat / jupyter-server / zh-CN 语言包 ..."
python -m pip install --quiet \
  "jupyterlite>=0.4,<0.5" \
  jupytext \
  nbformat \
  jupyter-server \
  jupyterlab-language-pack-zh-CN

# ----------------------------------------------------------
# 4. 转换 zip -> ipynb（幂等）
#    T-3.3 / AC12 / TC12：源 zip 缺失时跳过转换（warning + continue），
#    而非 exit 2。固化服务器本地已改的逻辑，使已转换过的 files/ 直接进 build。
# ----------------------------------------------------------
if [ ! -d "$SRC_DIR" ]; then
  echo "⚠️  警告：源 zip 目录不存在: $SRC_DIR"
  echo "    跳过 convert.py 转换步骤，直接使用现有 files/ 进行 build。"
  echo "    如需重新转换，请上传三级练习 zip 到该目录，或用 SRC_DIR=... bash build.sh 指定。"
else
  echo "🔁 运行 convert.py ..."
  python "$SCRIPT_DIR/convert.py" --src "$SRC_DIR" --out "$SCRIPT_DIR/files"
fi

# ----------------------------------------------------------
# 5. 废弃 首页.ipynb（B5 / AC14）
#    其内容已迁移到 HTML 首页（files/index.html），
#    build 前从 files/ 移除，使其不出现在站点文件树。
# ----------------------------------------------------------
if [ -f "$SCRIPT_DIR/files/首页.ipynb" ]; then
  echo "🧹 移除已废弃的 首页.ipynb（内容已迁移到 HTML 首页）..."
  rm -f "$SCRIPT_DIR/files/首页.ipynb"
fi

# ----------------------------------------------------------
# 6. jupyter lite build（幂等，AC13）
# ----------------------------------------------------------
echo "🏗️  jupyter lite build ..."
# --contents 指向 files/，使其出现在站点文件树
# --base-url /jupyter/：站点挂在子路径，资源/worker/Pyodide 路径必须按 /jupyter/ 找，否则 404
python -m jupyter lite build \
  --config "$SCRIPT_DIR/jupyter_lite_config.json" \
  --base-url "/jupyter/" \
  --contents "$SCRIPT_DIR/files" \
  --output-dir "$SCRIPT_DIR/_output" \
  --force

# ----------------------------------------------------------
# 7. 注入自定义中文 HTML 首页（T-1 / AC1 / B7）
#    jupyter lite build 每次会重置 _output/index.html，因此必须在
#    build 之后用 files/index.html 覆盖 _output/index.html，固化自定义首页。
#    幂等：每次 build 末尾都覆盖，保证一致（AC13）。
# ----------------------------------------------------------
if [ -f "$SCRIPT_DIR/files/index.html" ]; then
  echo "📝 注入自定义中文 HTML 首页到 _output/index.html ..."
  cp "$SCRIPT_DIR/files/index.html" "$SCRIPT_DIR/_output/index.html"
else
  echo "⚠️  警告：files/index.html 不存在，跳过首页覆写（站点将使用 JupyterLab 默认页）。"
fi

echo ""
echo "========================================"
echo " ✅ 构建完成"
echo "========================================"
echo "产物目录: $SCRIPT_DIR/_output/"
echo "部署：将该目录挂载到 Express 的 /jupyter 路径（见 DEPLOY.md）"
echo "首页：访问 /jupyter/ 显示中文卡片导航页（自定义 HTML）"
echo "默认 app：notebook（经典 Notebook 7），lab 仍可通过 /jupyter/lab/ 访问"
