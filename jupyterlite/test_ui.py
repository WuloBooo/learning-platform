"""
test_ui.py —— JupyterLite 三级练习站点界面优化的自动化测试

覆盖范围（对应 PRD 验收标准与边界情况）：
  - B2 / TC9 / AC8 ：中文路径 URL 编码（按路径段编码，保留 "/"）
  - AC1 / AC2 / AC3：HTML 首页结构（卡片数、二级导航、题目链接、docx 链接）
  - AC7          ：所有资源链接带 /jupyter/ 前缀（无漏前缀 404）
  - F3 / TC3     ：notebook 链接格式 /jupyter/notebook/?path=<encoded>
  - 配置文件     ：jupyter_lite_config.json 结构与 apps 顺序
  - build.sh     ：脚本内容断言（Python 探测、jupyter-server、跳过转换、index 覆写）

运行：
    cd /Users/wulobooo/Desktop/学习平台/jupyterlite
    python3 -m pytest test_ui.py -v
"""

from __future__ import annotations

import json
import re
import urllib.parse
from pathlib import Path

import pytest

# ------------------------------------------------------------
# 路径常量
# ------------------------------------------------------------
BASE = Path(__file__).resolve().parent
INDEX_HTML = BASE / "files" / "index.html"
CONFIG_JSON = BASE / "jupyter_lite_config.json"
BUILD_SH = BASE / "build.sh"
FILES_DIR = BASE / "files"

# 题目数据（与 HTML 内 PRACTICES 一致，B8 数据驱动）
PRACTICES = [
    {
        "dir": "实操练习1",
        "topics": ["q2.ipynb", "q3_1.ipynb", "q3_2.ipynb", "q3_3.ipynb", "q3_4.ipynb"],
        "docx": "题目说明.docx",
    },
    {
        "dir": "实操练习2",
        "topics": ["q2.ipynb", "q3_1.ipynb", "q3_2.ipynb", "q3_3.ipynb", "q3_4.ipynb"],
        "docx": "题目说明.docx",
    },
]


# ============================================================
# 辅助函数（与 index.html 内 encodeChinesePath 等价的 Python 实现）
# ============================================================
def encode_chinese_path(chinese_path: str) -> str:
    """B2/TC9 关键：按路径段分别编码，保留 "/" 分隔符。

    错误做法是 ``urllib.parse.quote(chinese_path)`` —— 它会编码 "/"。
    正确做法是对每段 ``quote``，再用 "/" 拼回。

    :param chinese_path: 形如 ``三级/实操练习1/q3_1.ipynb``
    :return: 形如 ``%E4%B8%89%E7%BA%A7/%E5%AE%9E.../q3_1.ipynb``
    """
    return "/".join(urllib.parse.quote(seg) for seg in chinese_path.split("/"))


def notebook_url(practice_dir: str, filename: str) -> str:
    """生成打开 notebook 的完整 URL（F6）。"""
    path = f"三级/{practice_dir}/{filename}"
    return f"/jupyter/notebook/?path={encode_chinese_path(path)}"


def docx_url(practice_dir: str) -> str:
    """生成 docx 静态下载 URL。"""
    path = f"三级/{practice_dir}/题目说明.docx"
    return f"/jupyter/files/{encode_chinese_path(path)}"


def read_index_html() -> str:
    """读取 HTML 首页（UTF-8）。"""
    assert INDEX_HTML.exists(), f"缺少首页文件: {INDEX_HTML}"
    return INDEX_HTML.read_text(encoding="utf-8")


# ============================================================
# B2 / TC9 / AC8 ：中文路径 URL 编码
# ============================================================
class TestChinesePathEncoding:
    """验证中文路径编码正确：/ 保留，中文字符 percent-encoded。"""

    def test_slash_preserved(self) -> None:
        """encodeURI 语义：目录分隔符 / 不被编码。"""
        encoded = encode_chinese_path("三级/实操练习1/q3_1.ipynb")
        assert "/" in encoded, "目录分隔符 / 必须保留，不可被编码"

    def test_chinese_percent_encoded(self) -> None:
        """所有中文字符必须 percent-encoded（无裸中文）。"""
        encoded = encode_chinese_path("三级/实操练习1/q3_1.ipynb")
        # 编码后不应包含任何中文字符
        assert not re.search(r"[一-鿿]", encoded), \
            f"编码后仍含中文字符: {encoded}"

    def test_expected_prd_format(self) -> None:
        """TC9：精确匹配 PRD 给定的期望格式。"""
        encoded = encode_chinese_path("三级/实操练习1/q3_1.ipynb")
        expected = "%E4%B8%89%E7%BA%A7/%E5%AE%9E%E6%93%8D%E7%BB%83%E4%B9%A01/q3_1.ipynb"
        assert encoded == expected, f"\n got: {encoded}\nwant: {expected}"

    def test_notebook_url_format(self) -> None:
        """F3/TC3：notebook URL 形如 /jupyter/notebook/?path=<encoded>。"""
        url = notebook_url("实操练习1", "q3_1.ipynb")
        assert url.startswith("/jupyter/notebook/?path="), url
        # path 段 / 保留
        path_val = url.split("path=", 1)[1]
        assert "/" in path_val, "path 参数内 / 必须保留"

    def test_distinct_from_wrong_full_encode(self) -> None:
        """与错误做法（整体 encodeURIComponent）区分：整体编码会把 / 变 %2F。

        注意：Python ``urllib.parse.quote`` 默认 ``safe='/'``（不编码 /），
        要模拟 JS ``encodeURIComponent``（safe 为空），必须显式 ``safe=''``。
        """
        wrong = urllib.parse.quote("三级/实操练习1/q3_1.ipynb", safe="")  # 模拟 encodeURIComponent
        right = encode_chinese_path("三级/实操练习1/q3_1.ipynb")
        assert "%2F" in wrong.upper(), "对照组：整体 encodeURIComponent 应出现 %2F"
        assert "%2F" not in right.upper(), "正确做法不应出现 %2F"

    @pytest.mark.parametrize("practice", PRACTICES)
    @pytest.mark.parametrize("topic", ["q2.ipynb", "q3_1.ipynb", "q3_2.ipynb", "q3_3.ipynb", "q3_4.ipynb"])
    def test_each_topic_url_decodes_back(self, practice: dict, topic: str) -> None:
        """编码后能正确解码回原始中文路径（往返一致）。"""
        url = notebook_url(practice["dir"], topic)
        encoded = url.split("path=", 1)[1]
        decoded = urllib.parse.unquote(encoded)
        assert decoded == f"三级/{practice['dir']}/{topic}"

    def test_docx_url_format(self) -> None:
        """TC7：docx 下载 URL 带 /jupyter/files/ 前缀。"""
        url = docx_url("实操练习1")
        assert url.startswith("/jupyter/files/"), url
        assert url.endswith("%E9%A2%98%E7%9B%AE%E8%AF%B4%E6%98%8E.docx"), url


# ============================================================
# AC1 / AC2 / AC3 ：HTML 首页结构断言
# ============================================================
class TestHtmlStructure:
    """验证 HTML 首页包含必要的结构元素。"""

    def test_has_chinese_title(self) -> None:
        """AC1：中文标题区。"""
        html = read_index_html()
        assert "三级 · Python / PyTorch 浏览器练习环境" in html

    def test_has_notice_bar(self) -> None:
        """F1.1：顶部首次加载提示条（迁移自首页.ipynb）。"""
        html = read_index_html()
        assert "首次加载提示" in html or "首次加载" in html
        # 推荐浏览器
        assert "Chrome" in html and "Edge" in html
        # 耗时说明
        assert "1-2 分钟" in html or "1-2分钟" in html

    def test_has_two_practice_cards(self) -> None:
        """AC2：一级卡片两张（练习1、练习2）。"""
        html = read_index_html()
        assert "实操练习1" in html
        assert "实操练习2" in html

    def test_has_topic_list_logic(self) -> None:
        """AC3：二级导航含 5 个题目 + docx 下载（数据驱动 JS）。"""
        html = read_index_html()
        # 五个题号文件名出现在数据中
        for f in ["q2.ipynb", "q3_1.ipynb", "q3_2.ipynb", "q3_3.ipynb", "q3_4.ipynb"]:
            assert f in html, f"二级导航数据缺少 {f}"
        # docx 下载链接文案
        assert "题目说明" in html
        assert "docx" in html.lower()

    def test_has_spa_view_switching(self) -> None:
        """F2：单页内视图切换（SPA）。"""
        html = read_index_html()
        assert 'id="view-home"' in html
        assert 'id="view-practice"' in html
        assert "hashchange" in html or "hash" in html.lower()

    def test_no_legacy_jupyterlab_default(self) -> None:
        """AC1：首页是自定义 HTML，非 JupyterLab 默认页。"""
        html = read_index_html()
        # 不应是 jupyterlite 自动生成的 lab shell
        assert "<div id=\"main\"" not in html or "jp-LabShell" not in html

    def test_lang_attribute(self) -> None:
        """F4：HTML lang=zh-CN。"""
        html = read_index_html()
        assert 'lang="zh-CN"' in html or "lang='zh-CN'" in html


# ============================================================
# AC7 ：资源链接前缀完整性（无漏前缀 404）
# ============================================================
class TestResourcePrefix:
    """所有静态资源链接必须带 /jupyter/ 前缀或使用相对路径。"""

    def test_no_root_absolute_resources(self) -> None:
        """B1/TC8：禁止出现 href="/style.css" 这类漏前缀的根绝对路径。

        允许的形式：
          - /jupyter/...     （带前缀）
          - ./... 或 相对名 （相对路径）
          - #...             （hash 锚点）
          - http(s)://...    （外链，本页无）
        """
        html = read_index_html()
        # 提取所有 href/src 的值
        attrs = re.findall(r'(?:href|src)\s*=\s*"([^"]+)"', html)
        bad = []
        for a in attrs:
            # 跳过 hash、相对、协议外链、mailto
            if a.startswith("#") or a.startswith("./") or a.startswith("http") or a.startswith("mailto"):
                continue
            # 纯文件名（相对，如 style.css）允许
            if "/" not in a and not a.startswith("/"):
                continue
            # 根绝对路径必须以 /jupyter/ 开头
            if a.startswith("/"):
                if not a.startswith("/jupyter/"):
                    bad.append(a)
        assert not bad, f"发现漏前缀的资源链接（将 404）: {bad}"


# ============================================================
# 配置文件断言
# ============================================================
class TestConfig:
    """jupyter_lite_config.json 结构与关键设置。"""

    def load_config(self) -> dict:
        assert CONFIG_JSON.exists(), f"缺少配置文件: {CONFIG_JSON}"
        return json.loads(CONFIG_JSON.read_text(encoding="utf-8"))

    def test_notebook_is_default_app(self) -> None:
        """F3：apps 顺序 notebook 在前（默认 app）。"""
        cfg = self.load_config()
        apps = cfg["LiteAppConfig"]["apps"]
        assert apps[0] == "notebook", f"默认 app 应为 notebook，实际 apps={apps}"
        assert "lab" in apps, "lab 应保留可访问"

    def test_base_url(self) -> None:
        """base_url = /jupyter/。"""
        cfg = self.load_config()
        assert cfg["LiteAppConfig"]["base_url"] == "/jupyter/"

    def test_pyodide_pinned(self) -> None:
        """pyodide 0.26.2 锁定不变。"""
        cfg = self.load_config()
        assert "0.26.2" in cfg["LiteAppConfig"]["pyodide_url"]

    def test_locale_zh_cn(self) -> None:
        """T-2：中文化 locale 配置存在。"""
        cfg = self.load_config()
        settings = cfg.get("SettingsAddon", {})
        tx = settings.get("@jupyterlab/translation-extension:plugin", {})
        assert tx.get("locale") == "zh_CN", f"locale 应为 zh_CN，实际: {tx}"


# ============================================================
# build.sh 脚本内容断言（AC10/AC11/AC12/AC1/B5）
# ============================================================
class TestBuildScript:
    """build.sh 静态断言（不实际执行 build，因依赖网络与 jupyterlite）。"""

    def read_build(self) -> str:
        assert BUILD_SH.exists(), f"缺少 build.sh: {BUILD_SH}"
        return BUILD_SH.read_text(encoding="utf-8")

    def test_no_hardcoded_python312(self) -> None:
        """AC10：不再写死 PYTHON_BIN=python3.12 作为唯一选项。"""
        b = self.read_build()
        # 允许 python3.12 出现在探测列表里，但不应是 PYTHON_BIN 默认赋值
        assert 'PYTHON_BIN="${PYTHON_BIN:-python3.12}"' not in b, \
            "不应再有 PYTHON_BIN 写死 python3.12 的默认赋值"
        # 应有探测循环
        assert "python3.12 python3.11 python3.10 python3" in b, \
            "应按序探测 python3.12 > 3.11 > 3.10 > python3"

    def test_python_env_override_supported(self) -> None:
        """TC11/AC10：仍允许 PYTHON_BIN 环境变量覆盖。"""
        b = self.read_build()
        assert "${PYTHON_BIN" in b, "应支持 PYTHON_BIN 环境变量"

    def test_min_version_check(self) -> None:
        """AC10：版本需 >= 3.10。"""
        b = self.read_build()
        assert "version_info[1]" in b or "3.10" in b, \
            "应校验 Python 版本 >= 3.10"

    def test_jupyter_server_in_deps(self) -> None:
        """AC11/T-3.2：依赖列表含 jupyter-server。"""
        b = self.read_build()
        assert "jupyter-server" in b, "依赖列表应含 jupyter-server"

    def test_language_pack_in_deps(self) -> None:
        """T-2：依赖列表含 zh-CN 语言包。"""
        b = self.read_build()
        assert "jupyterlab-language-pack-zh-CN" in b

    def test_src_missing_does_not_exit_2(self) -> None:
        """AC12/T-3.3/TC12：源 zip 缺失时 continue 而非 exit 2。

        只检查实际命令行（去掉注释），避免命中注释里的历史描述。
        """
        b = self.read_build()
        # 去掉注释行后再断言（注释里允许出现 "exit 2" 的历史说明）
        code_lines = [
            ln for ln in b.splitlines()
            if not ln.lstrip().startswith("#")  # 去掉整行注释
        ]
        code = "\n".join(code_lines)
        # 不应有作为命令的 exit 2
        assert re.search(r"(?<![#'\"])exit\s+2\b", code) is None, \
            "源 zip 缺失分支不应再以 exit 2 退出"
        # 应有跳过分支（warning + 跳过文案）
        assert "跳过" in code, "源缺失分支应有跳过警告"

    def test_removes_legacy_home_ipynb(self) -> None:
        """B5/AC14：build 前移除 首页.ipynb。"""
        b = self.read_build()
        assert "首页.ipynb" in b
        assert "rm -f" in b

    def test_index_html_injection(self) -> None:
        """T-1/AC1/B7：build 末尾覆写 _output/index.html。"""
        b = self.read_build()
        assert "_output/index.html" in b
        assert "files/index.html" in b
        # cp 覆写命令
        assert "cp \"$SCRIPT_DIR/files/index.html\" \"$SCRIPT_DIR/_output/index.html\"" in b


# ============================================================
# 真实文件存在性（数据驱动 B8 与现状一致）
# ============================================================
class TestFileTreeConsistency:
    """HTML 数据驱动的题目文件在磁盘上确实存在。"""

    @pytest.mark.parametrize("practice", PRACTICES)
    def test_topic_files_exist(self, practice: dict) -> None:
        d = FILES_DIR / "三级" / practice["dir"]
        assert d.exists(), f"练习目录不存在: {d}"
        for topic in practice["topics"]:
            assert (d / topic).exists(), f"题目文件不存在: {d / topic}"

    @pytest.mark.parametrize("practice", PRACTICES)
    def test_docx_exists(self, practice: dict) -> None:
        d = FILES_DIR / "三级" / practice["dir"]
        assert (d / practice["docx"]).exists(), f"题目说明 docx 不存在: {d / practice['docx']}"


# ============================================================
# build.sh 行为冒烟测试（不依赖 jupyterlite 网络）
# ============================================================
class TestBuildShSmoke:
    """验证 build.sh 的早阶段逻辑能跑通（不实际触发网络 build）。

    通过 SRC_DIR 指向不存在路径，配合 set -e，验证：
      - Python 探测不报错退出（TC11）
      - 源缺失分支走 continue 而非 exit 2（TC12 / AC12）
    完整 jupyterlite build 需在服务器执行（AC13 幂等）。
    """

    def _patch_and_run(self, env_extra: dict, replacements: dict) -> subprocess.CompletedProcess:
        """执行 patch 过的 build.sh，避免触发网络 pip 下载。

        :param env_extra: 额外环境变量
        :param replacements: {原文本: 新文本} 替换表。
            通过把耗时/网络的行替换为 no-op 或早退 hook，实现离线冒烟测试。
        """
        import subprocess
        import tempfile

        src = BUILD_SH.read_text(encoding="utf-8")
        for old, new in replacements.items():
            assert old in src, f"patch 锚点不存在: {old!r}"
            src = src.replace(old, new, 1)

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".sh", delete=False, encoding="utf-8"
        ) as tf:
            tf.write(src)
            tmp_path = tf.name

        env = {"SRC_DIR": "/tmp/__definitely_not_exists__", **env_extra}
        try:
            return subprocess.run(
                ["bash", tmp_path],
                cwd=str(BASE),
                capture_output=True,
                text=True,
                timeout=20,
                env={**__import__("os").environ, **env},
            )
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    # 离线 patch：把所有 pip install 与 venv 创建替换为 no-op，
    # 避免触发网络下载（冒烟测试只验证脚本控制流，不验证 pip 安装结果）。
    OFFLINE_PATCHES = {
        # 跳过 venv 创建与激活（复用一个已存在的解释器即可）
        '"$PYTHON_BIN" -m venv "$VENV_DIR"': ': # [SMOKE] skip venv create',
        'source "$VENV_DIR/bin/activate"': ': # [SMOKE] skip venv activate',
        # 跳过所有 pip install（网络操作）
        'python -m pip install --upgrade pip --quiet':
            ': # [SMOKE] skip pip upgrade',
        'python -m pip install --quiet \\\n  "jupyterlite>=0.4,<0.5" \\\n  jupytext \\\n  nbformat \\\n  jupyter-server \\\n  jupyterlab-language-pack-zh-CN':
            ': # [SMOKE] skip deps install',
    }

    def test_python_detection_runs_without_error(self) -> None:
        """TC11：Python 探测代码块能跑通并打印 "使用 Python"。"""
        result = self._patch_and_run(
            {"PYTHON_BIN": ""}, dict(self.OFFLINE_PATCHES)
        )
        combined = result.stdout + result.stderr
        assert "使用 Python" in combined, \
            f"Python 探测未输出预期文案:\nstdout={result.stdout}\nstderr={result.stderr}"

    def test_env_override_python_bin(self) -> None:
        """TC11：PYTHON_BIN 环境变量能覆盖探测结果。"""
        import shutil
        py = shutil.which("python3") or shutil.which("python")
        if not py:
            pytest.skip("本机无 python3/python，跳过环境覆盖测试")
        result = self._patch_and_run(
            {"PYTHON_BIN": py}, dict(self.OFFLINE_PATCHES)
        )
        combined = result.stdout + result.stderr
        assert "使用 Python" in combined, \
            f"环境变量覆盖未生效:\nstdout={result.stdout}\nstderr={result.stderr}"

    def test_src_missing_does_not_exit_2(self) -> None:
        """TC12/AC12：SRC_DIR 不存在时不应以 exit 2 退出。

        离线跑完整个源缺失分支，并在首页.ipynb 移除段前注入早退 hook。
        能到达 hook 说明源缺失分支走的是 warning + 跳过（而非 exit 2）。
        """
        patches = dict(self.OFFLINE_PATCHES)
        # 额外注入早退 hook（在源缺失分支之后、首页.ipynb 移除段之前）
        patches['if [ -f "$SCRIPT_DIR/files/首页.ipynb" ]; then'] = (
            'echo "[SMOKE] reached post-src-check, exiting early"; exit 0\n'
            'if [ -f "$SCRIPT_DIR/files/首页.ipynb" ]; then'
        )
        result = self._patch_and_run({"PYTHON_BIN": ""}, patches)
        # 到达 hook 说明源缺失分支走的是 continue（否则会在源检查处退出）
        assert "[SMOKE] reached post-src-check" in result.stdout, \
            f"源缺失未走 continue 分支:\nstdout={result.stdout}\nstderr={result.stderr}"
        # 且有跳过警告（源缺失分支打印）
        assert "跳过" in result.stdout, \
            f"源缺失分支应打印跳过警告:\nstdout={result.stdout}"
        # 退出码不是 2（早退 hook 退出码为 0）
        assert result.returncode != 2, \
            f"源缺失不应 exit 2，实际返回码 {result.returncode}"


if __name__ == "__main__":
    # 直接运行：python3 test_ui.py
    pytest.main([__file__, "-v", "--tb=short"])
