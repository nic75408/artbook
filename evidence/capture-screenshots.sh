#!/bin/bash
# Capture typography evidence screenshots using Chrome headless
# Run while local server is active on port 8765

set -e

WORKSPACE="/Users/david/人文/艺术手册/artbook/.worktrees/t_be1a5c90"
EVIDENCE_DIR="$WORKSPACE/evidence"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SERVER_URL="http://127.0.0.1:8765"

mkdir -p "$EVIDENCE_DIR"

echo "Capturing typography screenshots at iPhone 14 Pro viewport (390x844)..."

# Feed page
"$CHROME" --headless --disable-gpu --screenshot="$EVIDENCE_DIR/typography-feed-390x844.png" \
  --window-size=390,844 \
  "$SERVER_URL/" 2>/dev/null
echo "✓ Feed page captured"

# Detail page
"$CHROME" --headless --disable-gpu --screenshot="$EVIDENCE_DIR/typography-detail-390x844.png" \
  --window-size=390,844 \
  "$SERVER_URL/#/work/monet-1840-1" 2>/dev/null
echo "✓ Detail page captured"

# Collection page
"$CHROME" --headless --disable-gpu --screenshot="$EVIDENCE_DIR/typography-collection-390x844.png" \
  --window-size=390,844 \
  "$SERVER_URL/#/collection/impressionism" 2>/dev/null
echo "✓ Collection page captured"

echo ""
echo "Screenshots saved to: $EVIDENCE_DIR"
ls -la "$EVIDENCE_DIR"/*.png
