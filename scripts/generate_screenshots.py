#!/usr/bin/env python3
"""为合规样本生成三种视口的 UI 截图"""
import json
import subprocess
import os
from pathlib import Path
from datetime import datetime

# 读取合规样本
with open('data/evidence/acceptance_evidence_region_scope_filtered.json', 'r', encoding='utf-8') as f:
    evidence = json.load(f)

samples = evidence['samples'][:12]  # 只取前 12 个
output_dir = Path('data/evidence/screenshots')
output_dir.mkdir(exist_ok=True)

# 视口配置
viewports = [
    ('iphone14pro', 390, 844),
    ('iphonese', 375, 667),
    ('android', 360, 800),
]

base_url = 'http://127.0.0.1:8888'

print(f"开始为 {len(samples)} 个样本生成截图...")
print(f"视口配置：{viewports}")
print(f"输出目录：{output_dir}")

success_count = 0
for i, sample in enumerate(samples, 1):
    work_id = sample['id']
    region = sample['region']
    print(f"\n[{i}/{len(samples)}] {work_id} (region={region})")
    
    url = f"{base_url}/#/work/{work_id}"
    
    for vp_name, width, height in viewports:
        screenshot_path = output_dir / f"{work_id}_{vp_name}_{width}x{height}.png"
        
        # 使用 playwright 截图
        script = f'''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.webkit.launch()
    page = browser.new_page(viewport={{"width": {width}, "height": {height}}})
    page.goto("{url}")
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
                success_count += 1
            else:
                err = result.stderr[:200] if result.stderr else 'failed'
                print(f"  ✗ {vp_name}: {err}")
        except subprocess.TimeoutExpired:
            print(f"  ✗ {vp_name}: timeout")
        except Exception as e:
            print(f"  ✗ {vp_name}: {e}")

print(f"\n完成：{success_count}/{len(samples) * 3} 张截图")

# 生成截图清单
manifest = {
    "generated_at": datetime.now().isoformat(),
    "base_url": base_url,
    "viewports": [{"name": n, "width": w, "height": h} for n, w, h in viewports],
    "samples": [
        {
            "id": s['id'],
            "title_zh": s['title_zh'],
            "region": s['region'],
            "screenshots": [
                f"{s['id']}_{vp[0]}_{vp[1]}x{vp[2]}.png"
                for vp in viewports
            ]
        }
        for s in samples
    ],
    "total_screenshots": success_count,
    "output_dir": str(output_dir)
}

with open(output_dir / 'manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"截图清单已保存到：{output_dir / 'manifest.json'}")
