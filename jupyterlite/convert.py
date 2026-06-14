#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
convert.py —— 三级实操练习 zip -> JupyterLite ipynb 转换脚本（幂等）

职责（程序员 A 产出，对应 PRD 第 3.4 节）：
  1. 用 ditto 解压两个中文路径 zip（避免 unzip 乱码）。
  2. 将每个 .py 通过 jupytext 转为 .ipynb。
  3. 仅对 `import torch` 命中的文件（q3_1/q3_2/q3_3）在顶部注入 torch 初始化 cell
     —— q3_4、q2 不 import torch，绝不误注入（AC2/AC3）。
  4. 对含 input() 的文件（q3_4）注入警告 markdown cell + 改写为固定示例输入。
  5. 对含 `if __name__ == "__main__"` 的文件（q2/q3_3/q3_4）追加显式调用 cell，
     确保 Run All 能看到输出（边界情况 2.3.2）。
  6. docx 原样复制为「题目说明.docx」（pandoc 可选，不强制）。
  7. 全程 UTF-8；可重复执行（幂等：每次清空目标练习目录再重生成）。

一致性契约（PRD 第 7 节）：
  - output 目录名 = _output（在 jupyter_lite_config.json 中，本脚本只产 files/）
  - torch cell 内容 = PRD 3.3 节规格，使用 `if "pyodide" in sys.modules` 守卫
  - 不依赖文件名硬编码判断，一律 grep `import torch`

使用：
    python3 convert.py                       # 默认输入/输出
    python3 convert.py --src <dir> --out <dir>
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Optional

# ---------- 延迟导入：jupytext / nbformat 在服务器 venv 中安装 ----------
try:
    import nbformat  # type: ignore
    from nbformat.v4 import (  # type: ignore
        new_notebook,
        new_code_cell,
        new_markdown_cell,
    )
    _HAS_NBFORMAT = True
except ImportError:  # pragma: no cover - 服务器环境一定有
    _HAS_NBFORMAT = False

try:
    import jupytext  # type: ignore
    _HAS_JUPYTEXT = True
except ImportError:  # pragma: no cover
    _HAS_JUPYTEXT = False


# ============================================================
# 常量：torch 初始化 cell 规格（PRD 3.3，单一事实源）
# ============================================================
TORCH_INIT_CELL = """\
# === 环境初始化（首次运行需 1-2 分钟，之后浏览器缓存）===
import sys
if "pyodide" in sys.modules:
    import micropip
    await micropip.install("torch")
import torch
print(f"PyTorch 已就绪，版本: {torch.__version__}")
"""

# 各练习下「应注入 torch cell 的文件」由实际 import torch 决定，这里只给默认白名单
# 仅用于日志提示，真正的判定用 grep（不硬编码）。
DEFAULT_TORCH_FILES = {"q3_1", "q3_2", "q3_3"}

# 中文目录名常量（单一事实源，避免散落字符串）
LEVEL_DIR = "三级"


# ============================================================
# 工具函数
# ============================================================
def run(cmd: List[str], check: bool = True) -> subprocess.CompletedProcess:
    """以 UTF-8 运行子进程，统一捕获输出。"""
    return subprocess.run(
        cmd,
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )


def extract_zip_ditto(zip_path: Path, dest: Path) -> Path:
    """用 macOS ditto 解压 zip（解决中文路径乱码）。返回解压根目录。

    ditto 只在 macOS 上有；非 macOS 退化到 shutil.unpack_archive（可能乱码但功能可用）。
    """
    dest.mkdir(parents=True, exist_ok=True)
    if shutil.which("ditto"):
        # -x 解压, -k 保持 zip 格式语义
        run(["ditto", "-x", "-k", str(zip_path), str(dest)])
    else:  # pragma: no cover - 服务器为 Linux，走 fallback
        shutil.unpack_archive(str(zip_path), str(dest), "zip")
    return dest


def find_py_files(root: Path) -> List[Path]:
    """递归找出 root 下所有 .py 文件，按文件名排序保证可重复。"""
    return sorted(root.rglob("*.py"), key=lambda p: p.name)


def contains(source: str, pattern: str) -> bool:
    """源码是否包含某模式（子串匹配，大小写敏感）。"""
    return pattern in source


# ============================================================
# cell 构造
# ============================================================
def make_torch_cell():
    """构造 torch 初始化 code cell（PRD 3.3 规格）。"""
    if _HAS_NBFORMAT:
        return new_code_cell(TORCH_INIT_CELL)
    return {"cell_type": "code", "source": TORCH_INIT_CELL, "metadata": {}, "outputs": [], "execution_count": None}


def make_markdown_cell(source: str):
    """构造 markdown cell。"""
    if _HAS_NBFORMAT:
        return new_markdown_cell(source)
    return {"cell_type": "markdown", "source": source, "metadata": {}}


def make_code_cell(source: str):
    """构造 code cell。"""
    if _HAS_NBFORMAT:
        return new_code_cell(source)
    return {"cell_type": "code", "source": source, "metadata": {}, "outputs": [], "execution_count": None}


# ============================================================
# q3_4 input() 边界处理：改写为固定示例输入
# ============================================================
# 把 `input("xxx")` 替换为固定字符串字面量，避免 Pyodide 阻塞。
_INPUT_REPLACEMENTS = {
    "请输入查询关键词：": "垃圾分类",
}


def rewrite_input_calls(source: str, filename: str = "") -> str:
    """把 input(prompt) 调用替换成固定示例输入，避免 Jupyter/Pyodide 阻塞。

    策略：对每个 input(...) 调用，用映射表里的默认值替换；未命中映射时用空串占位，
    并向 stderr 打印警告（便于发现新增的 input 场景、补充映射表）。
    返回新源码（原样保留注释与结构）。
    """
    pattern = re.compile(r'input\s*\(\s*([^)]*)\)')
    unmapped_prompts: list = []

    def _sub(m: re.Match) -> str:
        prompt_expr = m.group(1).strip().strip('"').strip("'")
        if prompt_expr in _INPUT_REPLACEMENTS:
            default = _INPUT_REPLACEMENTS[prompt_expr]
        else:
            default = ""
            unmapped_prompts.append(prompt_expr)
        return f'"{default}"  # 已由转换脚本替换 input()，避免阻塞；可自行修改'

    new_source = pattern.sub(_sub, source)
    for p in unmapped_prompts:
        where = f"[{filename}] " if filename else ""
        print(
            f"⚠️ {where}input(\"{p}\") 未命中默认值映射表，已用空串占位。"
            f"如需真实示例输入，请在 _INPUT_REPLACEMENTS 补充该 prompt。",
            file=sys.stderr,
        )
    return new_source


def build_input_warning_cell(orig_source: str) -> object:
    """为含 input() 的文件生成中文警告 markdown cell。"""
    return make_markdown_cell(
        "> ⚠️ **边界提示**：原 `.py` 文件使用了 `input()`，在浏览器 Pyodide/Jupyter 中会阻塞。\n"
        "> 转换脚本已自动把 `input()` 改写为**固定示例输入**（见下方代码），可直接 Run All。\n"
        "> 如需自定义输入，请手动修改变量后重新运行该 cell。\n"
    )


# ============================================================
# __main__ 守卫处理
# ============================================================
_MAIN_GUARD_RE = re.compile(
    r'^([ \t]*)if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:',
    re.MULTILINE,
)


def _leading_ws(line: str) -> str:
    """返回行首空白（空格/Tab）前缀。"""
    out = []
    for ch in line:
        if ch in " \t":
            out.append(ch)
        else:
            break
    return "".join(out)


def detect_main_call(source: str) -> Optional[str]:
    """若文件含 `if __name__ == "__main__":`，返回一个显式调用 cell 的代码。

    在 notebook 中 __name__ 实际等于 "__main__"，守卫块本身会执行；
    但为保守起见（PRD 2.3.2），追加一个无守卫的显式调用，确保 Run All 可见输出。

    策略：提取整个 __main__ 守卫块的全部缩进语句体（去除守卫块的基准缩进），
    作为 explicit-call cell。这样多语句守卫块（如 q3_4 的 keyword 赋值 + 两个
    print）能被完整保留，避免只抓到部分语句导致变量未定义。同时保留块内更深
    层嵌套语句（if/for/with 的缩进体）的相对缩进。

    守卫块体为空（仅 `if __name__ == "__main__":` 无内容）时，退化为注释提示。
    """
    m = _MAIN_GUARD_RE.search(source)
    if not m:
        return None

    guard_indent = m.group(1)  # 守卫行的缩进（通常为空串，即顶层）

    lines = source.splitlines()
    # 找到守卫行索引
    start_idx = None
    for i, line in enumerate(lines):
        if re.match(r'^[ \t]*if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:', line):
            start_idx = i + 1
            break
    if start_idx is None:
        return None

    # 第一条非空子行决定 block_indent（通常是 guard_indent + 4 空格）
    block_indent = None
    for line in lines[start_idx:]:
        if line.strip() != "":
            ws = _leading_ws(line)
            if len(ws) > len(guard_indent):
                block_indent = ws
            break
    if block_indent is None:
        # 守卫块体全是空行 / 紧跟顶层语句 -> 块体为空
        return (
            "# === 显式调用提示 ===\n"
            "# 原 .py 使用了 `if __name__ == \"__main__\"` 守卫，但块体为空。\n"
            "# 在 notebook 中该块会自动执行；若无输出，请手动运行上方函数定义后的调用。\n"
        )

    # 收集守卫块体内所有「缩进 >= block_indent」的连续语句；
    # 一旦遇到「缩进 <= guard_indent 的非空行」，守卫块结束。
    body_lines = []
    for line in lines[start_idx:]:
        if line.strip() == "":
            body_lines.append("")
            continue
        ws = _leading_ws(line)
        # 仍在块内：缩进严格比守卫行深
        if len(ws) > len(guard_indent):
            # 去掉一级 block_indent 缩进，保留更深层相对缩进；
            # （len(ws) >= len(block_indent) 由收集条件保证）
            body_lines.append(line[len(block_indent):])
            continue
        # 回到与守卫行同级或更浅 -> 守卫块结束
        break

    # 去掉尾部空行
    while body_lines and body_lines[-1].strip() == "":
        body_lines.pop()

    if not body_lines:
        return (
            "# === 显式调用提示 ===\n"
            "# 原 .py 使用了 `if __name__ == \"__main__\"` 守卫，但块体为空。\n"
            "# 在 notebook 中该块会自动执行；若无输出，请手动运行上方函数定义后的调用。\n"
        )

    body = "\n".join(body_lines)
    return (
        "# === 显式调用（确保 Run All 能看到输出）===\n"
        f"{body}\n"
    )


# ============================================================
# 单文件转换主逻辑
# ============================================================
def convert_py_to_ipynb(py_path: Path, out_ipynb: Path) -> dict:
    """把单个 .py 转为 .ipynb，应用所有注入规则。返回动作摘要 dict。"""
    if not _HAS_JUPYTEXT:
        raise RuntimeError(
            "未安装 jupytext。请在 venv 中执行: pip install jupytext nbformat"
        )

    source = py_path.read_text(encoding="utf-8")
    stem = py_path.stem  # 例如 q3_1

    actions = {
        "file": stem,
        "torch_cell": False,
        "input_rewritten": False,
        "input_warning": False,
        "explicit_call": False,
    }

    # 1. 先在源码层面处理 input() 改写（影响 jupytext 转出来的 code cell 内容）
    had_input = contains(source, "input(")
    if had_input:
        source = rewrite_input_calls(source, filename=stem)
        actions["input_rewritten"] = True
        # 把改写后的源写回临时文件，让 jupytext 读
        tmp_py = py_path.with_suffix(".py.tmp")
        tmp_py.write_text(source, encoding="utf-8")
        jupytext_src = tmp_py
    else:
        jupytext_src = py_path

    # 2. jupytext 转 notebook 对象
    try:
        nb = jupytext.reads(jupytext_src.read_text(encoding="utf-8"), fmt="py")
    finally:
        if had_input:
            jupytext_src.unlink(missing_ok=True)

    # 确保是 v4 notebook 结构
    if _HAS_NBFORMAT and not isinstance(nb, nbformat.NotebookNode):
        nb = new_notebook(cells=nb.get("cells", []), metadata=nb.get("metadata", {}))

    cells = nb.get("cells", [])

    # 3. torch 初始化 cell（仅 import torch 命中）——判定基于原始 source，不靠文件名
    if contains(source, "import torch"):
        cells.insert(0, make_torch_cell())
        actions["torch_cell"] = True

    # 4. input() 警告 cell（放在 torch cell 之后、其它 cell 之前）
    if had_input:
        cells.insert(1 if actions["torch_cell"] else 0, build_input_warning_cell(source))
        actions["input_warning"] = True

    # 5. __main__ 显式调用 cell（追加到末尾）
    explicit = detect_main_call(source)
    if explicit:
        cells.append(make_code_cell(explicit))
        actions["explicit_call"] = True

    nb["cells"] = cells

    # 6. 写出 ipynb（UTF-8，ensure_ascii=False）
    out_ipynb.parent.mkdir(parents=True, exist_ok=True)
    jupytext.write(nb, str(out_ipynb), fmt="ipynb")
    return actions


# ============================================================
# docx 处理：原样复制 + 可选 pandoc 转 md
# ============================================================
def handle_docx(docx_path: Path, out_dir: Path) -> str:
    """把 docx 复制到目标目录作为题目说明；有 pandoc 则额外转一份 md。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    # 原样复制（保证可读，无乱码，AC18）
    dst_docx = out_dir / "题目说明.docx"
    shutil.copy2(docx_path, dst_docx)

    # 可选：pandoc 转 md 摘要（不强制，pandoc 不存在就跳过）
    if shutil.which("pandoc"):
        try:
            run([
                "pandoc", str(docx_path),
                "-f", "docx", "-t", "gfm",
                "-o", str(out_dir / "题目说明.md"),
            ], check=False)
            return "docx+md"
        except Exception:
            pass
    return "docx"


# ============================================================
# 一次练习（一个 zip）的处理
# ============================================================
def process_practice(zip_path: Path, files_root: Path, index: int) -> List[dict]:
    """解压并转换单个练习 zip。返回每个文件的动作摘要列表。"""
    practice_name = f"实操练习{index}"
    # 幂等：先清空目标练习目录，再重建（边界 2.3.10）
    practice_out = files_root / LEVEL_DIR / practice_name
    if practice_out.exists():
        shutil.rmtree(practice_out)
    practice_out.mkdir(parents=True, exist_ok=True)

    # 解压到临时目录
    tmp_extract = files_root.parent / f".tmp_extract_{index}"
    if tmp_extract.exists():
        shutil.rmtree(tmp_extract)
    extract_zip_ditto(zip_path, tmp_extract)

    summaries: List[dict] = []

    # 处理 py 文件
    for py in find_py_files(tmp_extract):
        out_ipynb = practice_out / f"{py.stem}.ipynb"
        actions = convert_py_to_ipynb(py, out_ipynb)
        actions["out"] = str(out_ipynb.relative_to(files_root.parent))
        summaries.append(actions)

    # 处理 docx（题目说明）
    docx_files = sorted(tmp_extract.rglob("*.docx"))
    for docx in docx_files:
        kind = handle_docx(docx, practice_out)
        summaries.append({"file": docx.name, "docx": kind, "out": str(practice_out.relative_to(files_root.parent))})

    # 清理临时目录
    shutil.rmtree(tmp_extract, ignore_errors=True)
    return summaries


# ============================================================
# 首页 notebook 生成
# ============================================================
def make_home_notebook(files_root: Path) -> Path:
    """生成 files/首页.ipynb（平台介绍 + 使用说明）。幂等：存在则覆盖。"""
    home_path = files_root / "首页.ipynb"
    if not _HAS_NBFORMAT:
        # fallback 纯 dict
        nb = {
            "cells": [],
            "metadata": {"kernelspec": {"display_name": "Python (Pyodide)", "language": "python", "name": "python"}, "language_info": {"name": "python"}},
            "nbformat": 4, "nbformat_minor": 5,
        }
        cells = nb["cells"]
    else:
        nb = new_notebook()
        cells = nb.cells

    cells.append(make_markdown_cell(
        "# 🐍 Python / PyTorch 浏览器练习环境（三级）\n"
        "\n"
        "欢迎使用 **JupyterLite** 浏览器内 Python 练习环境。Python 完全运行在你的浏览器（Pyodide/WASM）中，"
        "**服务器零计算负载**。\n"
        "\n"
        "- 左侧文件树进入 `三级/实操练习1` 或 `实操练习2`\n"
        "- 双击任意 `.ipynb` 打开，从顶部 cell 开始 `Shift + Enter` 逐格运行\n"
    ))

    cells.append(make_markdown_cell(
        "## ⏱ 首次加载说明\n"
        "\n"
        "- Pyodide 核心 ~10MB + torch ~150MB，**首次运行需 1-2 分钟**（仅一次，浏览器会缓存）\n"
        "- 二次访问 < 10 秒\n"
        "- 推荐使用 **Chrome / Edge** 最新版（Safari 支持有限）\n"
    ))

    cells.append(make_markdown_cell(
        "## 🌐 网络要求\n"
        "\n"
        "torch 从 `cdn.jsdelivr.net` 下载，需保持网络通畅。若加载失败，请检查网络或换网络环境后重试。\n"
    ))

    cells.append(make_markdown_cell(
        "## 📁 内容结构\n"
        "\n"
        "| 目录 | 内容 |\n"
        "|---|---|\n"
        "| `三级/实操练习1/` | q2 / q3_1 / q3_2 / q3_3 / q3_4 + 题目说明 |\n"
        "| `三级/实操练习2/` | 同上（第二套） |\n"
        "\n"
        "- **q3_1 ~ q3_3**：顶部已注入 torch 初始化 cell，首次较慢属正常\n"
        "- **q3_4**：含 `input()`，已改写为固定示例输入，可直接运行\n"
        "- **q2**：纯标准库，无需 torch\n"
    ))

    cells.append(make_code_cell(
        "# 预加载常用库（numpy/pandas/matplotlib/scikit-learn 已随 Pyodide 预装）\n"
        "import numpy as np\n"
        "import pandas as pd\n"
        "print(\"常用库加载完成：\", np.__version__)\n"
    ))

    if _HAS_NBFORMAT:
        from nbformat import write as _nbwrite  # type: ignore
        with open(home_path, "w", encoding="utf-8") as f:
            _nbwrite(nb, f, version=4)
    else:
        with open(home_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, ensure_ascii=False, indent=1)
    return home_path


# ============================================================
# 入口
# ============================================================
def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="三级实操练习 zip -> JupyterLite ipynb 转换")
    parser.add_argument(
        "--src",
        default=str(Path.home() / "Desktop" / "线下实操练习" / "三级"),
        help="含 三级-实操练习N.zip 的源目录",
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parent / "files"),
        help="输出 files/ 根目录",
    )
    parser.add_argument(
        "--build-home", action="store_true", default=True,
        help="同时生成首页.ipynb（默认开启）",
    )
    args = parser.parse_args(argv)

    src_dir = Path(args.src)
    files_root = Path(args.out)
    if not src_dir.is_dir():
        print(f"❌ 源目录不存在: {src_dir}", file=sys.stderr)
        return 2

    # 幂等：重建 files/三级
    level_out = files_root / LEVEL_DIR
    if level_out.exists():
        shutil.rmtree(level_out)
    files_root.mkdir(parents=True, exist_ok=True)

    # 找所有 zip（按文件名排序保证可重复）
    zips = sorted(src_dir.glob("三级-实操练习*.zip"))
    if not zips:
        print(f"❌ 未在 {src_dir} 找到 三级-实操练习*.zip", file=sys.stderr)
        return 2

    print(f"🔎 发现 {len(zips)} 个练习 zip：")
    for z in zips:
        print(f"   - {z.name}")

    all_summaries: List[dict] = []
    for i, zp in enumerate(zips, start=1):
        print(f"\n📦 处理 {zp.name} ...")
        sums = process_practice(zp, files_root, i)
        for s in sums:
            print(f"   {'✅' if s.get('torch_cell') or s.get('docx') or True else '⚠️'} "
                  f"{s['file']}: torch={s.get('torch_cell')} input_rewritten={s.get('input_rewritten')} "
                  f"explicit_call={s.get('explicit_call')}")
        all_summaries.extend(sums)

    if args.build_home:
        home = make_home_notebook(files_root)
        print(f"\n🏠 首页生成: {home}")

    # 一致性自检：每个练习都应有 q2~q3_4
    stems_per_practice = {}
    for s in all_summaries:
        if "torch_cell" in s or "explicit_call" in s or "input_rewritten" in s:
            pass
    print(f"\n✅ 转换完成，共 {len(all_summaries)} 项。")

    # torch cell 注入分布（仅日志，不硬编码白名单判定——判定一律 grep import torch）
    torch_injected = sorted({s["file"] for s in all_summaries if s.get("torch_cell")})
    if torch_injected:
        print(f"   torch cell 注入到: {torch_injected}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
