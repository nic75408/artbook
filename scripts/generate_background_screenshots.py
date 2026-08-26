#!/usr/bin/env python3
"""为 met-436000_background 生成缺失的 iPhone SE 和 Android 截图"""
import subprocess
from pathlib import Path

output_dir = Path('data/evidence/screenshots')
output_dir.mkdir(exist_ok=True)

# 只生成缺失的两个视口
viewports = [
    ('iphonese', 375, 667),
    ('android', 360, 800),
]

base_url = 'http://127.0.0.1:8888'
work_id = 'met-436000'

print(f"为 {work_id}_background 生成缺失的截图...")

for vp_name, width, height in viewports:
    screenshot_path = output_dir / f"{work_id}_background_{vp_name}_{width}x{height}.png"
    
    script = f'''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.webkit.launch()
    page = browser.new_page(viewport={{"width": {width}, "height": {height}}})
    page.goto("{base_url}/#/work/{work_id}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    # 滚动到圆形局部图位置（在第 2 段之后）
    page.evaluate("window.scrollBy(0, 400)")
    page.wait_for_timeout(500)
    page.screenshot(path="{screenshot_path}")
    browser.close()
'''
    
    try:
        result = subprocess.run(['python3', '-c', script], capture_output=True, text=True, timeout=60)
        if result.returncode == 0 and screenshot_path.exists():
            print(f"  ✓ {vp_name}: {screenshot_path.name}")
        else:
            err = result.stderr[:200] if result.stderr else 'failed'
            print(f"  ✗ {vp_name}: {err}")
    except subprocess.TimeoutExpired:
        print(f"  ✗ {vp_name}: timeout")
    except Exception as e:
        print(f"  ✗ {vp_name}: {e}")

print("\n完成！请更新 manifest.json")
