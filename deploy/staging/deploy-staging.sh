#!/usr/bin/env bash
# Script triển khai trên máy staging, do job deploy-staging của từng repository gọi.
# Cách dùng: ./deploy-staging.sh <api|web> <version>
set -euo pipefail
SERVICE="$1"; VERSION="$2"
cd "$(dirname "$0")"
case "$SERVICE" in
  api) VAR=API_VERSION ;;
  web) VAR=WEB_VERSION ;;
  *) echo "Service không hợp lệ: $SERVICE"; exit 2 ;;
esac
echo "Triển khai $SERVICE $VERSION lên staging lúc $(date -u +%Y-%m-%dT%H:%M:%SZ)"
sed -i "s/^$VAR=.*/$VAR=$VERSION/" phien-ban.conf
docker compose --env-file phien-ban.conf up -d --wait "$SERVICE"
docker compose --env-file phien-ban.conf ps --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}' "$SERVICE"
echo "Hoàn tất triển khai $SERVICE $VERSION"
