#!/usr/bin/env bash
# Installs the chromium build browser-mode tests run in.
#
# On a normal machine `playwright install --with-deps` is enough, but that needs
# root to apt-install chromium's shared libraries. The dev container has no root
# and none of those libraries, so when they are missing this vendors them under
# $HOME from the same Debian packages, and vitest.browser.config.mts points
# LD_LIBRARY_PATH and FONTCONFIG_FILE at the result. Where the libraries are
# already present (CI, a normal desktop) the vendoring step is skipped and
# nothing is written to $HOME.
set -euo pipefail

LIB_DIR="${CHROMIUM_DEPS_DIR:-$HOME/.local/share/chromium-deps}"

vendored_ld_path() {
  echo "$LIB_DIR/usr/lib/x86_64-linux-gnu:$LIB_DIR/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
}

missing_libs() {
  LD_LIBRARY_PATH="$(vendored_ld_path)" ldd "$1" | grep "not found" || true
}

# Only the headless shell: it is a third of the full chromium download and it is
# what a headless test run uses anyway.
pnpm exec playwright install chromium --only-shell

SHELL_BIN=$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | tail -1 || true)

if [ -z "$SHELL_BIN" ]; then
  echo "No chrome-headless-shell found under ~/.cache/ms-playwright — nothing to check."
  exit 0
fi

if [ -n "$(missing_libs "$SHELL_BIN")" ]; then
  echo "Missing shared libraries — vendoring them into $LIB_DIR"

  APT_DIR=$(mktemp -d)
  trap 'rm -rf "$APT_DIR"' EXIT
  mkdir -p "$APT_DIR/lists/partial" "$APT_DIR/cache/archives/partial" "$APT_DIR/debs"

  apt-get -o Dir::State::Lists="$APT_DIR/lists" -o Dir::Cache="$APT_DIR/cache" update

  # chromium's own dependency list, shipped next to the binary, plus DejaVu:
  # that list only asks for Liberation, and one font family alone renders
  # everything it does not cover as a blank box.
  DEPS=$(sed -E 's/ \(.*\)//; s/ \|.*//' "$(dirname "$SHELL_BIN")/deb.deps" | grep -E '^(lib|fonts-)')
  DEPS="$DEPS fonts-dejavu-core"

  # libc and libgcc come from the container itself; a second copy of those is
  # how you get "failed to map segment" instead of a working browser.
  CLOSURE=$(apt-cache -o Dir::State::Lists="$APT_DIR/lists" depends --recurse \
    --no-recommends --no-suggests --no-conflicts --no-breaks --no-replaces --no-enhances \
    $DEPS | grep -E '^(lib|fonts-|fontconfig)' | grep -vE '^(libc6|libgcc-s1)$' | sort -u)

  (cd "$APT_DIR/debs" && apt-get -o Dir::State::Lists="$APT_DIR/lists" -o Dir::Cache="$APT_DIR/cache" download $CLOSURE)

  mkdir -p "$LIB_DIR"
  for deb in "$APT_DIR"/debs/*.deb; do
    dpkg-deb -x "$deb" "$LIB_DIR"
  done

  STILL_MISSING=$(missing_libs "$SHELL_BIN")
  if [ -n "$STILL_MISSING" ]; then
    echo "Still missing libraries:"
    echo "$STILL_MISSING"
    exit 1
  fi
fi

if [ -d "$LIB_DIR" ]; then
  # fontconfig only searches the system font directories, which hold nothing
  # here: without this file chromium finds no font at all and lays every string
  # out with zero-metric glyphs — text renders invisible and every width
  # assertion reads 0.
  mkdir -p "$LIB_DIR/fontcache"
  cat > "$LIB_DIR/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>$LIB_DIR/usr/share/fonts</dir>
  <cachedir>$LIB_DIR/fontcache</cachedir>
  <include ignore_missing="yes">$LIB_DIR/etc/fonts/conf.d</include>
</fontconfig>
EOF
  echo "chromium is runnable with the libraries vendored in $LIB_DIR"
else
  echo "chromium has all its shared libraries. Nothing to vendor."
fi
