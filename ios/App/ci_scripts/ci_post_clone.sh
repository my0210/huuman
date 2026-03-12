#!/bin/sh

# Xcode Cloud post-clone script
# Installs npm dependencies so SPM can resolve Capacitor plugins from node_modules

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install
