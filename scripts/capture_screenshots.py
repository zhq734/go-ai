"""生成 README 所需的界面截图（桌面明亮 / 桌面暗色 / 移动端 / 终局弹窗）。

使用方式：
    python3 scripts/capture_screenshots.py [base_url]

默认访问本地 Vite 预览服务 http://127.0.0.1:4173/。
创建者：zhenghq
"""

from __future__ import annotations

import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "images"


def play_opening(page) -> None:
    """在棋盘上点出一个小目开局，让截图包含真实对局内容。"""
    box = page.locator("canvas.board-canvas").bounding_box()
    if not box:
        raise RuntimeError("未找到棋盘画布")
    padding = max(26.0, box["width"] * 0.055)
    gap = (box["width"] - padding * 2) / 8
    for col, row in ((2, 2), (6, 6), (6, 2), (2, 6), (4, 4)):
        x = box["x"] + padding + col * gap
        y = box["y"] + padding + row * gap
        page.mouse.click(x, y)
        page.wait_for_timeout(700)


def set_theme(page, preference: str) -> None:
    """通过页面按钮把主题切换到指定偏好。"""
    for _ in range(3):
        label = page.locator(".theme-toggle").inner_text()
        if preference in label:
            return
        page.locator(".theme-toggle").click()
        page.wait_for_timeout(200)


def main() -> int:
    """入口：依次生成三张截图。"""
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173/"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()

        desktop = browser.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=2)
        page = desktop.new_page()
        page.goto(base_url, wait_until="networkidle")
        set_theme(page, "明亮")
        play_opening(page)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(OUTPUT / "screenshot-light.png"))
        set_theme(page, "暗色")
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUTPUT / "screenshot-dark.png"))

        # 终局弹窗：切回明亮主题后认输，展示胜负弹窗
        set_theme(page, "明亮")
        page.get_by_role("button", name="认输", exact=True).click()
        page.wait_for_timeout(700)
        page.screenshot(path=str(OUTPUT / "screenshot-result.png"))
        desktop.close()

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        phone = mobile.new_page()
        phone.goto(base_url, wait_until="networkidle")
        set_theme(phone, "明亮")
        play_opening(phone)
        phone.wait_for_timeout(1200)
        phone.screenshot(path=str(OUTPUT / "screenshot-mobile.png"), full_page=True)
        mobile.close()
        browser.close()
    print(f"截图已写入 {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
