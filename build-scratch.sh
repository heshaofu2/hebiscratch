#!/bin/bash
# 构建 scratch-gui 并复制到前端目录

set -e

echo "Building scratch-gui..."
cd scratch-gui-build
npm run build

echo "Copying build files to frontend..."
cp -r build/* ../frontend/public/scratch/

echo "Done!"
