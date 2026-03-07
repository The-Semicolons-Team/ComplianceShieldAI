#!/bin/bash
# Build script: installs pip dependencies into each Lambda function directory
# Run this BEFORE `cdk deploy` to bundle Python dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAMBDA_DIR="$SCRIPT_DIR/../src/lambda"

echo "=== Building Lambda functions ==="

for fn_dir in "$LAMBDA_DIR"/*/; do
  fn_name=$(basename "$fn_dir")
  req_file="$fn_dir/requirements.txt"

  if [ -f "$req_file" ]; then
    echo "→ Installing dependencies for $fn_name..."
    pip install -q -r "$req_file" -t "$fn_dir" --upgrade --platform manylinux2014_aarch64 --only-binary=:all: 2>/dev/null || \
    pip install -q -r "$req_file" -t "$fn_dir" --upgrade
    echo "  ✓ $fn_name dependencies installed"
  else
    echo "  - $fn_name: no requirements.txt, skipping"
  fi
done

echo ""
echo "=== Build complete! Run 'cd infrastructure && npx cdk deploy' next ==="
