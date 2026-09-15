#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  export PATH="$PWD/.tools/node-v22.23.2-darwin-arm64/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 22.13 or newer, then retry.' >&2
  exit 1
fi
npm run sync
npm run check
cd mobile
if ! npx --yes eas-cli@23.2.0 whoami; then
  npx --yes eas-cli@23.2.0 login --browser
fi
exec npx --yes eas-cli@23.2.0 build --platform ios --profile testflight \
  --auto-submit --message 'FWCC direct website content refresh' \
  --what-to-test 'Explore Home, Messages, Events, Connect, and Give. Search and save messages, play a video, open an event, add it to your calendar, and try an event reminder. Content refreshes directly from the church website. Test pull-to-refresh and offline access after a successful refresh. Video playback and external forms require internet.'
