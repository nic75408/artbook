#!/usr/bin/env python3
"""
扫描 artbook 数据源，识别内容为空或仅包含空白字符的推荐项。

输出报告到 reports/empty-recommendations.txt
"""

import json
import os
from pathlib import Path

DATA_DIR = Path("data")
REPORTS_DIR = Path("reports")

def check_catalog():
    """检查 catalog.json 中的作品记录"""
    catalog_path = DATA_DIR / "catalog.json"
    if not catalog_path.exists():
        return []
    
    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)
    
    issues = []
    works = catalog.get('works', [])
    
    for w in works:
        wid = w.get('id', 'unknown')
        
        # 检查推荐卡片渲染所需的核心字段
        t = w.get('t', '')  # 标题
        a = w.get('a', '')  # 作者
        th = w.get('th', '')  # 缩略图
        
        if not t or not str(t).strip():
            issues.append({
                'id': wid,
                'location': 'catalog.json',
                'field': 't (标题)',
                'value': str(t) if t else '(空)',
                'recommendation_type': '首页推荐/相关推荐池'
            })
        
        if not a or not str(a).strip():
            issues.append({
                'id': wid,
                'location': 'catalog.json',
                'field': 'a (作者)',
                'value': str(a) if a else '(空)',
                'recommendation_type': '首页推荐/相关推荐池'
            })
        
        if not th or not str(th).strip():
            issues.append({
                'id': wid,
                'location': 'catalog.json',
                'field': 'th (缩略图)',
                'value': str(th) if th else '(空)',
                'recommendation_type': '首页推荐/相关推荐池'
            })
    
    return issues

def check_issues():
    """检查各期 issue 文件中的作品记录"""
    issues_dir = DATA_DIR / "issues"
    if not issues_dir.exists():
        return []
    
    issues = []
    issue_files = sorted([f for f in issues_dir.iterdir() if f.suffix == '.json'], reverse=True)
    
    for issue_file in issue_files:
        with open(issue_file, 'r', encoding='utf-8') as f:
            issue_data = json.load(f)
        
        issue_date = issue_data.get('date', issue_file.stem)
        works = issue_data.get('works', [])
        
        for w in works:
            wid = w.get('id', 'unknown')
            
            # 检查首页 Feed 渲染所需字段
            title_zh = w.get('title_zh', '')
            artist_zh = w.get('artist_zh', '')
            image_feed = w.get('image', {}).get('feed', '') if isinstance(w.get('image'), dict) else ''
            
            if not title_zh or not str(title_zh).strip():
                issues.append({
                    'id': wid,
                    'location': f'issues/{issue_file.name}',
                    'field': 'title_zh (中文标题)',
                    'value': str(title_zh) if title_zh else '(空)',
                    'recommendation_type': '首页 Feed'
                })
            
            if not artist_zh or not str(artist_zh).strip():
                issues.append({
                    'id': wid,
                    'location': f'issues/{issue_file.name}',
                    'field': 'artist_zh (中文作者)',
                    'value': str(artist_zh) if artist_zh else '(空)',
                    'recommendation_type': '首页 Feed'
                })
            
            if not image_feed or not str(image_feed).strip():
                issues.append({
                    'id': wid,
                    'location': f'issues/{issue_file.name}',
                    'field': 'image.feed (Feed 图片 URL)',
                    'value': str(image_feed) if image_feed else '(空)',
                    'recommendation_type': '首页 Feed'
                })
    
    return issues

def generate_report(issues):
    """生成扫描报告"""
    REPORTS_DIR.mkdir(exist_ok=True)
    report_path = REPORTS_DIR / "empty-recommendations.txt"
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("艺术手册 - 空内容推荐项扫描报告\n")
        f.write("=" * 60 + "\n\n")
        
        if not issues:
            f.write("✓ 未发现空内容推荐项\n")
            f.write("\n扫描范围:\n")
            f.write("  - data/catalog.json (推荐池)\n")
            f.write("  - data/issues/*.json (各期作品)\n")
            f.write(f"\n扫描时间：{Path(report_path).stat().st_mtime}\n")
        else:
            f.write(f"发现 {len(issues)} 个问题字段:\n\n")
            
            # 按位置分组
            by_location = {}
            for issue in issues:
                loc = issue['location']
                if loc not in by_location:
                    by_location[loc] = []
                by_location[loc].append(issue)
            
            for loc, loc_issues in by_location.items():
                f.write(f"\n{loc} ({len(loc_issues)} 个问题):\n")
                f.write("-" * 40 + "\n")
                for issue in loc_issues:
                    f.write(f"  ID: {issue['id']}\n")
                    f.write(f"    字段：{issue['field']}\n")
                    f.write(f"    值：{issue['value']}\n")
                    f.write(f"    影响：{issue['recommendation_type']}\n\n")
            
            f.write("\n" + "=" * 60 + "\n")
            f.write(f"总计：{len(issues)} 个问题字段\n")
            f.write(f"扫描时间：{Path(report_path).stat().st_mtime}\n")
    
    return report_path

def main():
    print("扫描 artbook 数据源中的空内容推荐项...")
    
    catalog_issues = check_catalog()
    issue_issues = check_issues()
    
    all_issues = catalog_issues + issue_issues
    
    report_path = generate_report(all_issues)
    
    if all_issues:
        print(f"发现 {len(all_issues)} 个问题字段")
        print(f"报告已生成：{report_path}")
    else:
        print("✓ 未发现空内容推荐项")
        print(f"报告已生成：{report_path}")
    
    return 0 if not all_issues else 1

if __name__ == "__main__":
    exit(main())
