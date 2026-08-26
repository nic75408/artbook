#!/usr/bin/env python3
"""
Capture DevTools-style screenshots for typography evidence.
Run this script while the local server is running on port 8765.
Requires: playwright (pip install playwright)
"""

import subprocess
import sys
import os

WORKSPACE = "/Users/david/人文/艺术手册/artbook/.worktrees/t_be1a5c90"
EVIDENCE_DIR = os.path.join(WORKSPACE, "evidence")
SERVER_URL = "http://127.0.0.1:8765"

# Pages to capture
PAGES = [
    ("feed", "/", "Feed 页 - 品牌标题与作品列表"),
    ("detail", "/#/work/monet-1840-1", "Detail 页 - 作品标题与正文"),
    ("collection", "/#/collection/impressionism", "Collection 页 - 版心一致性"),
]

def check_playwright():
    """Check if playwright is installed"""
    try:
        import playwright
        return True
    except ImportError:
        return False

def capture_with_playwright():
    """Use Playwright to capture screenshots with viewport 390x844"""
    from playwright.sync_api import sync_playwright
    
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.webkit.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2
        )
        
        for name, path, desc in PAGES:
            url = SERVER_URL + path
            print(f"Capturing {name}: {url}")
            page.goto(url, wait_until="networkidle")
            screenshot_path = os.path.join(EVIDENCE_DIR, f"typography-{name}-390x844.png")
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"  Saved: {screenshot_path}")
        
        browser.close()
    
    print("\n✓ All screenshots captured successfully")
    print(f"Output directory: {EVIDENCE_DIR}")

def main():
    if not check_playwright():
        print("Playwright not installed. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "-q"])
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "webkit"])
    
    capture_with_playwright()

if __name__ == "__main__":
    main()
