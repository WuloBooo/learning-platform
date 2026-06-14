#!/usr/bin/env bash
# build.sh —— JupyterLite 三级练习站点服务器端一键构建脚本（幂等）
#
# 职责（PRD F5/F8）：
#   1. 检测/安装 Python 3.12（缺则明确报错指引）
#   2. 创建独立 venv（不污染系统 Python，不影响 Node 服务，AC15）
#   3. 安装 jupyterlite + jupytext + nbformat
#   4. 运行 convert.py（zip -> ipynb，幂等）
#   5. jupyter lite build 生成 _output/（幂等，AC13）
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

PYTHON_BIN="${PYTHON_BIN:-python3.12}"

echo "========================================"
echo " JupyterLite 三级练习站点构建"
echo "========================================"

# ----------------------------------------------------------
# 1. 检测 Python 3.12
# ----------------------------------------------------------
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "❌ 未找到 $PYTHON_BIN。请先安装 Python 3.12："
  echo "   Ubuntu/Debian (deadsnakes):"
  echo "     sudo add-apt-repository ppa:deadsnakes/ppa -y"
  echo "     sudo apt-get update && sudo apt-get install -y python3.12 python3.12-venv"
  echo "   或源码编译：https://www.python.org/downloads/"
  exit 1
fi

PY_VER="$($PYTHON_BIN --version)"
echo "✅ $PY_VER"

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
# ----------------------------------------------------------
echo "📦 安装 jupyterlite / jupytext / nbformat ..."
python -m pip install --quiet \
  "jupyterlite>=0.4,<0.5" \
  jupytext \
  nbformat

# ----------------------------------------------------------
# 4. 转换 zip -> ipynb（幂等）
# ----------------------------------------------------------
if [ ! -d "$SRC_DIR" ]; then
  echo "❌ 源 zip 目录不存在: $SRC_DIR"
  echo "   请上传三级练习 zip 到该目录，或用 SRC_DIR=... bash build.sh 指定。"
  exit 2
fi

echo "🔁 运行 convert.py ..."
python "$SCRIPT_DIR/convert.py" --src "$SRC_DIR" --out "$SCRIPT_DIR/files"

# ----------------------------------------------------------
# 5. jupyter lite build（幂等，AC13）
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

echo ""
echo "========================================"
echo " ✅ 构建完成"
echo "========================================"
echo "产物目录: $SCRIPT_DIR/_output/"
echo "部署：将该目录挂载到 Express 的 /jupyter 路径（见 DEPLOY.md）"
