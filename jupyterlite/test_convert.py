#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_convert.py —— convert.py 的单元测试（pytest 风格，也可 unittest 运行）。

覆盖：
  - torch cell 仅注入 import torch 的文件（AC2/AC3）
  - q3_4 / q2 不被注入 torch cell
  - input() 被改写（不阻塞）
  - __main__ 显式调用 cell 追加
  - 中文路径无乱码
  - 幂等：连续两次转换结果一致

运行：
    python3 -m pytest test_convert.py -v
  或
    python3 test_convert.py            # unittest 模式
"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

# 让脚本能直接 import convert.py
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import convert  # noqa: E402

CONVERT_PY = ROOT / "convert.py"


def _load_ipynb(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def _cell_sources(ipynb: dict) -> list:
    """返回每个 cell 的 source 字符串列表（markdown 与 code 统一）。"""
    out = []
    for c in ipynb.get("cells", []):
        s = c.get("source", "")
        if isinstance(s, list):
            s = "".join(s)
        out.append(s)
    return out


class TestConvertRules(unittest.TestCase):
    """针对转换规则（无需完整 zip）的单元测试。"""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="jltest_"))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _convert_py_text(self, name: str, text: str) -> dict:
        """写一个临时 py，转换到临时 ipynb，返回 ipynb dict。"""
        py = self.tmp / f"{name}.py"
        py.write_text(text, encoding="utf-8")
        out_ipynb = self.tmp / f"{name}.ipynb"
        convert.convert_py_to_ipynb(py, out_ipynb)
        return _load_ipynb(out_ipynb)

    # ---- AC2: import torch 命中 -> 注入 torch cell ----
    def test_torch_cell_injected_for_torch_file(self):
        text = "import torch\nimport torch.nn as nn\n\nprint(torch.__version__)\n"
        ipynb = self._convert_py_text("q3_1", text)
        sources = _cell_sources(ipynb)
        # 第一个 cell 应是 torch 初始化
        self.assertIn("micropip.install", sources[0])
        self.assertIn('if "pyodide" in sys.modules', sources[0])

    # ---- AC3: 无 torch -> 不注入 torch cell ----
    def test_no_torch_cell_for_q2(self):
        text = "import random\n\ndef f():\n    return random.random()\n\nif __name__ == '__main__':\n    f()\n"
        ipynb = self._convert_py_text("q2", text)
        sources = _cell_sources(ipynb)
        joined = "\n".join(sources)
        self.assertNotIn("micropip.install", joined)

    def test_no_torch_cell_for_q3_4_dict(self):
        text = 'kb = {"a": "b"}\n\nif __name__ == "__main__":\n    keyword = input("请输入：")\n    print(keyword)\n'
        ipynb = self._convert_py_text("q3_4", text)
        sources = _cell_sources(ipynb)
        joined = "\n".join(sources)
        self.assertNotIn("micropip.install", joined)

    # ---- input() 改写 ----
    def test_input_rewritten(self):
        text = 'if __name__ == "__main__":\n    keyword = input("请输入查询关键词：")\n    print(keyword)\n'
        ipynb = self._convert_py_text("q3_4", text)
        sources = _cell_sources(ipynb)
        joined = "\n".join(sources)
        # 原始 input() 调用不应残留（被替换成固定字符串字面量）
        self.assertNotIn('input("请输入查询关键词：")', joined)
        # 应有警告 markdown cell
        self.assertTrue(any("边界提示" in s for s in sources))

    def test_input_default_value_used(self):
        text = 'k = input("请输入查询关键词：")\n'
        ipynb = self._convert_py_text("q3_4b", text)
        sources = _cell_sources(ipynb)
        joined = "\n".join(sources)
        # 应替换为映射表里的默认值「垃圾分类」
        self.assertIn("垃圾分类", joined)

    # ---- __main__ 显式调用 ----
    def test_explicit_call_appended(self):
        text = (
            "def simulate_test():\n"
            "    print('hello')\n"
            "\n"
            'if __name__ == "__main__":\n'
            "    simulate_test()\n"
        )
        ipynb = self._convert_py_text("q2b", text)
        sources = _cell_sources(ipynb)
        # 最后一个 cell 应含显式调用
        self.assertIn("simulate_test()", sources[-1])
        self.assertIn("显式调用", sources[-1])

    # ---- __main__ 块含多语句（q3_4 场景）：显式调用 cell 应包含整个守卫块体 ----
    def test_explicit_call_multi_statement_main_block(self):
        """q3_4 真实场景：__main__ 块含 keyword 赋值 + 两个 print（含函数调用）。

        回归覆盖 detect_main_call 旧 bug：旧逻辑只抓首个 `name(` 调用，
        导致 cell = `print("查询结果：")`，丢失 query_knowledge(keyword) 调用、
        且 keyword 未定义。
        """
        text = (
            "knowledge_base = {'a': 'b'}\n"
            "\n"
            "def query_knowledge(keyword):\n"
            "    return keyword\n"
            "\n"
            'if __name__ == "__main__":\n'
            '    keyword = "垃圾分类"\n'
            '    print("查询结果：")\n'
            "    print(query_knowledge(keyword))\n"
        )
        ipynb = self._convert_py_text("q3_4_multi", text)
        sources = _cell_sources(ipynb)
        last = sources[-1]
        self.assertIn("显式调用", last)
        # 整个守卫块体三条语句都应在显式调用 cell 内
        self.assertIn('keyword = "垃圾分类"', last)
        self.assertIn('print("查询结果：")', last)
        self.assertIn("print(query_knowledge(keyword))", last)
        # 不应只含 print("查询结果：")（旧 bug 的产物）
        self.assertNotEqual(
            last,
            "# === 显式调用（确保 Run All 能看到输出）===\n"
            'print("查询结果：")\n',
        )

    # ---- __main__ 块含嵌套缩进（if/for 体）：相对缩进应保留 ----
    def test_explicit_call_nested_indent_preserved(self):
        """守卫块内含嵌套结构（for/if）时，去外层缩进但保留内部相对缩进。"""
        text = (
            "def f(items):\n"
            "    return items\n"
            "\n"
            'if __name__ == "__main__":\n'
            "    for x in [1, 2, 3]:\n"
            "        print(x)\n"
            "    print('done')\n"
        )
        ipynb = self._convert_py_text("q_nested", text)
        sources = _cell_sources(ipynb)
        last = sources[-1]
        self.assertIn("for x in [1, 2, 3]:", last)
        # for 体内的 print(x) 应保留 4 空格相对缩进
        self.assertIn("    print(x)", last)
        self.assertIn("print('done')", last)

    def test_no_explicit_call_when_no_main(self):
        text = "import torch\nprint(torch.__version__)\n"
        ipynb = self._convert_py_text("q3_x", text)
        sources = _cell_sources(ipynb)
        joined = "\n".join(sources)
        self.assertNotIn("显式调用", joined)


class TestDetectMainCall(unittest.TestCase):
    """detect_main_call 纯单元测试（不依赖 jupytext/nbformat，直接测返回字符串）。

    覆盖 __main__ 块多语句场景（审查第 2 轮必改项）的回归保护。
    """

    def test_no_main_returns_none(self):
        self.assertIsNone(convert.detect_main_call("print('hi')\n"))

    def test_single_call_block(self):
        src = (
            'def f():\n    pass\n\n'
            'if __name__ == "__main__":\n'
            '    f()\n'
        )
        out = convert.detect_main_call(src)
        self.assertIsNotNone(out)
        self.assertIn("显式调用", out)
        self.assertIn("f()", out)

    def test_multi_statement_block_full_body_extracted(self):
        """q3_4 真实场景：赋值 + print + print(函数调用) 必须全部保留。

        回归旧 bug：旧逻辑只抓首个 `name(` 形态调用，得 `print("查询结果：")`，
        丢失 keyword 赋值与 query_knowledge(keyword) 调用。
        """
        src = (
            'if __name__ == "__main__":\n'
            '    keyword = "垃圾分类"\n'
            '    print("查询结果：")\n'
            '    print(query_knowledge(keyword))\n'
        )
        out = convert.detect_main_call(src)
        self.assertIsNotNone(out)
        self.assertIn('keyword = "垃圾分类"', out)
        self.assertIn('print("查询结果：")', out)
        self.assertIn("print(query_knowledge(keyword))", out)
        # 不应只含单独的 print("查询结果：")
        self.assertNotEqual(
            out,
            "# === 显式调用（确保 Run All 能看到输出）===\n"
            'print("查询结果：")\n',
        )

    def test_nested_indent_preserved(self):
        """块内 for/if 缩进体去外层缩进后应保留相对缩进。"""
        src = (
            'if __name__ == "__main__":\n'
            '    for x in [1, 2]:\n'
            '        print(x)\n'
            '    print("done")\n'
        )
        out = convert.detect_main_call(src)
        self.assertIn("for x in [1, 2]:", out)
        self.assertIn("    print(x)", out)  # 4 空格相对缩进
        self.assertIn('print("done")', out)

    def test_pass_only_block_preserved(self):
        """守卫块体为 pass -> pass 被原样保留（非空块）。"""
        src = (
            'def f():\n    pass\n\n'
            'if __name__ == "__main__":\n'
            '    pass\n'
        )
        out = convert.detect_main_call(src)
        self.assertIn("pass", out)

    def test_guard_not_first_line(self):
        """守卫不在文件首行：仍能正确定位并提取块体。"""
        src = (
            'import os\n'
            '\n'
            'CONST = 1\n'
            '\n'
            'if __name__ == "__main__":\n'
            '    print(CONST)\n'
        )
        out = convert.detect_main_call(src)
        self.assertIn("print(CONST)", out)


class TestIdempotentAndIntegration(unittest.TestCase):
    """集成测试：跑真实 zip（如果存在）+ 幂等性。"""

    SRC_DIR = Path.home() / "Desktop" / "线下实操练习" / "三级"

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="jlint_"))
        self.out_root = self.tmp / "files"

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    @unittest.skipUnless(
        (Path.home() / "Desktop" / "线下实操练习" / "三级").is_dir()
        and any((Path.home() / "Desktop" / "线下实操练习" / "三级").glob("三级-实操练习*.zip")),
        "无真实 zip，跳过集成测试",
    )
    def test_real_zips_full_flow(self):
        """真实 zip 全流程：转换 + 验证 AC2/AC3/AC10。"""
        rc = subprocess.run(
            [sys.executable, str(CONVERT_PY), "--src", str(self.SRC_DIR), "--out", str(self.out_root)],
            capture_output=True, text=True,
        )
        self.assertEqual(rc.returncode, 0, msg=rc.stderr)

        # AC10: 两套练习各 5 个 ipynb + 题目说明
        for i in (1, 2):
            d = self.out_root / "三级" / f"实操练习{i}"
            self.assertTrue(d.is_dir(), f"缺少 {d}")
            for stem in ("q2", "q3_1", "q3_2", "q3_3", "q3_4"):
                self.assertTrue((d / f"{stem}.ipynb").exists(), f"缺少 {stem}.ipynb")
            # docx 题目说明
            self.assertTrue((d / "题目说明.docx").exists())

        # AC2: q3_1/q3_2/q3_3 顶部有 torch cell
        for i in (1, 2):
            for stem in ("q3_1", "q3_2", "q3_3"):
                ipynb = _load_ipynb(self.out_root / "三级" / f"实操练习{i}" / f"{stem}.ipynb")
                self.assertIn("micropip.install", _cell_sources(ipynb)[0])

        # AC3: q2/q3_4 无 torch cell
        for i in (1, 2):
            for stem in ("q2", "q3_4"):
                ipynb = _load_ipynb(self.out_root / "三级" / f"实操练习{i}" / f"{stem}.ipynb")
                joined = "\n".join(_cell_sources(ipynb))
                self.assertNotIn("micropip.install", joined)

        # T6: q3_4 的 input 被改写
        for i in (1, 2):
            ipynb = _load_ipynb(self.out_root / "三级" / f"实操练习{i}" / "q3_4.ipynb")
            joined = "\n".join(_cell_sources(ipynb))
            self.assertIn("垃圾分类", joined)

    @unittest.skipUnless(
        (Path.home() / "Desktop" / "线下实操练习" / "三级").is_dir()
        and any((Path.home() / "Desktop" / "线下实操练习" / "三级").glob("三级-实操练习*.zip")),
        "无真实 zip，跳过幂等测试",
    )
    def test_idempotent_two_runs(self):
        """连续两次跑 convert.py，产物应一致（AC12/幂等）。"""
        env_args = [sys.executable, str(CONVERT_PY), "--src", str(self.SRC_DIR), "--out", str(self.out_root)]

        subprocess.run(env_args, check=True, capture_output=True, text=True)

        def snapshot():
            data = {}
            for ipynb in self.out_root.rglob("*.ipynb"):
                nb = _load_ipynb(ipynb)
                # 归一化 source
                norm_cells = []
                for c in nb.get("cells", []):
                    s = c.get("source", "")
                    if isinstance(s, list):
                        s = "".join(s)
                    norm_cells.append({"type": c.get("cell_type"), "source": s})
                data[str(ipynb.relative_to(self.out_root))] = norm_cells
            return data

        snap1 = snapshot()
        # 第二次运行（幂等：应重建而非追加）
        subprocess.run(env_args, check=True, capture_output=True, text=True)
        snap2 = snapshot()

        self.assertEqual(snap1.keys(), snap2.keys(), "两次运行产物文件集合不同（非幂等）")
        for k in snap1:
            self.assertEqual(snap1[k], snap2[k], f"文件 {k} 两次转换内容不一致（非幂等）")


if __name__ == "__main__":
    unittest.main(verbosity=2)
