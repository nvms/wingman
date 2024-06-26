#!/bin/bash
# Run setup commands within gitpod for a quick start
cd /workspace/wingman/webview/ && npm install
npm run dev &
cd /workspace/wingman/extension/ && npm install
npm run build:watch &
# Git lets you set your email arbitrarily. Might as well use this one, even if you're someone else.
NOREPLY_EMAIL="37577626+fredxfred@users.noreply.github.com"
git config --global user.email $NOREPLY_EMAIL