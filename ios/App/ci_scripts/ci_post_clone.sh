#!/bin/sh

# Xcode Cloud post-clone script
# Installs Node.js then npm dependencies so SPM can resolve
# Capacitor plugins referenced from node_modules/

set -e

echo "==> Installing Node.js via nvm..."
export NVM_DIR="$HOME/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20

echo "Node $(node --version) | npm $(npm --version)"

echo "==> Installing npm dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci --ignore-scripts

echo "==> Syncing Capacitor iOS project..."
npx cap sync ios

echo "==> Done. node_modules and Capacitor config ready."
