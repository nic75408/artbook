#!/usr/bin/env python3
"""为缺失视口的 3 个样本补充截图"""
import json
import subprocess
import os
from pathlib import Path
from datetime import datetime

# 需要补充截图的样本及其缺失的视口
missing_screenshots = {
    'met-435875': [
        ('iphone14pro', 390, 844),
        ('iphonese', 375, 667),
    ],
    'cma-160726_whole_work': [
        ('iphonese', 375, 667),
        ('android', 360, 800),
    ],
    'cma-101974_torso_neck': [
        ('iphonese', 375, 667),
        ('android', 360, 800),
    ],
}

output_dir = Path('data/evidence/screenshots')
output_dir.mkdir(exist_ok=True)

base_url = 'http://127.0.0.1:8889'

print(f"开始补充缺失的截图...")
print(f"需要补充的样本：{list(missing_screenshots.keys())}")
print(f"输出目录：{output_dir}")

success_count = 0
total_needed = sum(len(vps) for vps in missing_screenshots.values())
current = 0

for work_id, viewports in missing_screenshots.items():
    print(f"\n=== {work_id} ===")
    
    for vp_name, width, height in viewports:
        current += 1
        screenshot_filename = f"{work_id}_{vp_name}_{width}x{height}.png"
        screenshot_path = output_dir / screenshot_filename
        
        url = f"{base_url}/#/work/{work_id.replace('_whole_work', '').replace('_torso_neck', '').replace('_background', '')}"
        
        print(f"  [{current}/{total_needed}] 生成 {vp_name} ({width}x{height})...")
        
        # 使用 playwright 截图
        cmd = [
            'python3', '-c',
            f'''
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.webkit.launch()
    page = browser.new_page(viewport={{"width": {width}, "height": {height}}})
    page.goto("{url}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path="{screenshot_path}")
    browser.close()
            '''
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0 and screenshot_path.exists():
                print(f"    ✓ {screenshot_filename}")
                success_count += 1
            else:
                print(f"    ✗ 失败：{result.stderr[:150] if result.stderr else 'unknown error'}")
        except subprocess.TimeoutExpired:
            print(f"    ✗ timeout")
        except Exception as e:
            print(f"    ✗ 错误：{e}")

print(f"\n=== 完成 ===")
print(f"成功：{success_count}/{total_needed} 张截图")

# 更新 manifest.json
manifest_path = output_dir / 'manifest.json'
if manifest_path.exists():
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    # 更新每个样本的截图列表
    for sample in manifest['samples']:
        work_id = sample['id']
        if work_id in missing_screenshots:
            # 添加缺失的截图
            existing_files = {s.get('filename') or s.get('file') for s in sample.get('screenshots', [])}
            for vp_name, width, height in missing_screenshots[work_id]:
                filename = f"{work_id}_{vp_name}_{width}x{height}.png"
                if filename not in existing_files and (output_dir / filename).exists():
                    sample['screenshots'].append({
                        'viewport': vp_name,
                        'width': width,
                        'height': height,
                        'filename': filename
                    })
                    print(f"已更新 manifest: {filename}")
    
    # 更新总数
    manifest['total_screenshots'] = sum(len(s['screenshots']) for s in manifest['samples'])
    
    # 保存更新后的 manifest
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    print(f"\nmanifest.json 已更新:")
    print(f"  总截图数：{manifest['total_screenshots']}")
    print(f"  样本数：{len(manifest['samples'])}")
    
    # 验证所有样本都有 3 张截图
    incomplete = [s['id'] for s in manifest['samples'] if len(s['screenshots']) < 3]
    if incomplete:
        print(f"\n⚠ 仍有不完整的样本：{incomplete}")
    else:
        print(f"\n✓ 所有样本都有完整的 3 张截图")
