#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  export PATH="$PWD/.tools/node-v22.23.2-darwin-arm64/bin:$PATH"
fi
cd mobile
echo 'FWCC iPhone preview: complete Apple sign-in here, then choose your developer team.'
echo 'This uploads a TestFlight build. It does not publish a public App Store release.'
npx --yes eas-cli@23.2.0 build --platform ios --profile testflight \
  --auto-submit --message 'FWCC 0.1.0 phone preview' \
  --what-to-test 'Explore Home, Messages, Events, Connect, and Give. Search and save messages, play a video, open an event, add it to your calendar, and try an event reminder. This preview includes a church-content snapshot; automatic content updates are disabled. Video playback and external forms require internet.'
echo 'Cloud build and submission command finished. Apple may still be processing the upload.'
printf 'Press Enter to close this window. '
read -r FWCC_DONE
