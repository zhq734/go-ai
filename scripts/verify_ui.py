"""端到端验收脚本：覆盖 19 路切换、数子终局弹窗、认输弹窗、关闭与重开及控制台报错。

使用方式：
    python3 scripts/verify_ui.py [base_url]

创建者：zhenghq
"""

from __future__ import annotations

import sys

from playwright.sync_api import sync_playwright


def assert_true(condition: bool, message: str) -> None:
    """断言失败时抛出异常，便于 CI 捕获。"""
    if not condition:
        raise AssertionError(message)


def main() -> int:
    """执行浏览器端验收。"""
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173/"
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.goto(base_url, wait_until="networkidle")

        assert_true(page.title() == "围棋 · 人机对战", "页面标题不正确")
        assert_true(page.locator("canvas.board-canvas").is_visible(), "棋盘未渲染")

        # 切换到 19 路
        page.get_by_role("button", name="19 路", exact=True).click()
        page.wait_for_timeout(500)
        assert_true("19 路棋盘" in page.locator(".status__subtitle").inner_text(), "19 路切换失败")

        # 切回 9 路并切换到双人模式，连续两次停一手进入数子终局
        page.get_by_role("button", name="9 路", exact=True).click()
        page.wait_for_timeout(300)
        page.get_by_role("button", name="双人对弈", exact=True).click()
        page.wait_for_timeout(300)
        page.get_by_role("button", name="停一手", exact=True).click()
        page.wait_for_timeout(400)
        page.get_by_role("button", name="停一手", exact=True).click()
        page.wait_for_timeout(600)
        assert_true(page.locator(".result").is_visible(), "终局弹窗未出现")
        assert_true("数子终局" in page.locator(".result__reason").inner_text(), "终局原因未显示")
        assert_true(page.locator(".result__stat").count() >= 4, "终局数据项不足")
        assert_true("黑棋" in page.locator(".result__stats").inner_text(), "终局比分未显示")

        # 关闭弹窗后可查看棋盘，并通过侧栏按钮重新打开
        page.get_by_role("button", name="查看棋盘", exact=True).click()
        page.wait_for_timeout(300)
        assert_true(not page.locator(".result").is_visible(), "弹窗关闭失败")
        page.get_by_role("button", name="查看结果", exact=True).click()
        page.wait_for_timeout(300)
        assert_true(page.locator(".result").is_visible(), "弹窗重开失败")

        # 再来一局后切回人机模式并认输
        page.get_by_role("button", name="再来一局", exact=True).click()
        page.wait_for_timeout(300)
        page.get_by_role("button", name="人机对战", exact=True).click()
        page.wait_for_timeout(300)
        page.get_by_role("button", name="认输", exact=True).click()
        page.wait_for_timeout(400)
        assert_true(page.locator(".result").is_visible(), "认输弹窗未出现")
        assert_true("你输了" in page.locator(".result__title").inner_text(), "认输结果不正确")
        assert_true("认输" in page.locator(".result__reason").inner_text(), "认输原因不正确")
        assert_true("result--lose" in (page.locator(".result").get_attribute("class") or ""), "失败配色未生效")

        # 关闭弹窗后继续验证主题与模式切换
        page.get_by_role("button", name="查看棋盘", exact=True).click()
        page.wait_for_timeout(300)
        assert_true(not page.locator(".result").is_visible(), "认输弹窗关闭失败")

        # 暗色主题与双人模式
        page.locator(".theme-toggle").click()
        page.wait_for_timeout(300)
        page.get_by_role("button", name="双人对弈", exact=True).click()
        page.wait_for_timeout(300)
        assert_true(page.locator(".status__subtitle").inner_text().startswith("9 路"), "双人模式新局失败")

        browser.close()

    assert_true(not errors, f"控制台出现错误：{errors}")
    print("UI 验收通过：19 路切换 / 数子终局弹窗 / 关闭与重开 / 认输弹窗 / 主题与模式切换均正常")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
