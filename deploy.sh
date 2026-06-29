#!/usr/bin/env bash
# TINYCADE 一键部署脚本
#
# 用法:
#   DEPLOY_HOST=user@your-server \
#   DEPLOY_PATH=/opt/tinycade \
#   ./deploy.sh
#
# 可选环境变量:
#   DEPLOY_HOST     必填，格式 user@host
#   DEPLOY_PATH     必填，服务器上项目根目录绝对路径
#   DEPLOY_PORT     可选，server.js 监听端口，默认 8088
#   DEPLOY_SERVICE  可选，systemd 服务名，默认 tinycade
#   DRY_RUN=1       只打印要执行的命令，不实际执行
#
# 前置条件:
#   - 服务器已安装 Node.js >= 18
#   - 已 git clone 仓库到 $DEPLOY_PATH
#   - tinycade.service 已复制到 /etc/systemd/system/ 并 daemon-reload
#   - 本机有 SSH 免密登录到服务器

set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST must be set, e.g. user@your-server}"
: "${DEPLOY_PATH:?DEPLOY_PATH must be set, e.g. /opt/tinycade}"
DEPLOY_PORT="${DEPLOY_PORT:-8088}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-tinycade}"

GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
RESET=$'\033[0m'

log()  { echo "${GREEN}[deploy]${RESET} $*"; }
warn() { echo "${YELLOW}[deploy]${RESET} $*"; }
die()  { echo "${RED}[deploy]${RESET} $*" >&2; exit 1; }

run() {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "  $ $*"
  else
    "$@"
  fi
}

# 1. 确认工作区干净或仅包含预期改动
if command -v git >/dev/null 2>&1; then
  if ! git diff --quiet HEAD 2>/dev/null; then
    warn "工作区有未提交改动: $(git status --short | head -5)"
    warn "继续部署，但建议先 commit"
  fi
fi

# 2. 远端执行: 拉代码 → 构建 → 重启 → 状态检查
REMOTE_CMD="set -e
cd ${DEPLOY_PATH}
echo '--- git pull ---'
git pull --ff-only
echo '--- node version ---'
node --version
echo '--- npm run build ---'
npm run build
echo '--- restart service ---'
sudo systemctl restart ${DEPLOY_SERVICE}
sleep 1
echo '--- service status ---'
sudo systemctl --no-pager --full status ${DEPLOY_SERVICE} | head -n 20 || true
echo '--- port check ---'
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -E ':${DEPLOY_PORT}\b' || echo 'port ${DEPLOY_PORT} not listening yet'
echo '--- done ---'"

log "部署到 ${DEPLOY_HOST}:${DEPLOY_PATH}"
run ssh -o BatchMode=yes -o ConnectTimeout=10 "${DEPLOY_HOST}" "${REMOTE_CMD}"

log "完成。访问你的网站验证 (硬刷新 Ctrl+Shift+R 清掉浏览器缓存)。"
