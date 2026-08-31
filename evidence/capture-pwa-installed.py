#!/usr/bin/env python3
"""
Capture PWA installed home screen screenshot.
Simulates an iOS-style home screen with the artbook PWA icon installed.
"""

from playwright.sync_api import sync_playwright
import os

# Change to workspace directory
os.chdir('/Users/david/人文/艺术手册/artbook/.worktrees/t_7860d3f6')

with sync_playwright() as p:
    # Launch browser
    browser = p.chromium.launch(headless=True)
    
    # Create context with iPhone viewport
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},  # iPhone 14 Pro
        device_scale_factor=3,  # Retina display
    )
    
    page = context.new_page()
    
    # Navigate to the homescreen simulation page
    page.goto('http://localhost:8766/evidence/pwa-installed-homescreen.html', wait_until='networkidle')
    
    # Wait for page to fully render
    page.wait_for_timeout(1000)
    
    # Capture screenshot
    screenshot_path = '/Users/david/人文/艺术手册/artbook/.worktrees/t_7860d3f6/evidence/pwa-icon-yi-installed.png'
    page.screenshot(path=screenshot_path, full_page=True)
    
    print(f"Screenshot saved to: {screenshot_path}")
    
    # Get image dimensions
    from PIL import Image
    img = Image.open(screenshot_path)
    print(f"Image dimensions: {img.size[0]}x{img.size[1]}")
    
    browser.close()

print("Done!")
