#!/bin/sh
# Copies the files the site serves into _site/ at the repository root.
# The site has no build: _site/ is a plain copy, nothing is generated.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
out="$root/_site"

rm -rf "$out"
mkdir -p "$out"

for file in index.html favicon.svg; do
    cp "$root/$file" "$out/$file"
done

for dir in css js data; do
    cp -R "$root/$dir" "$out/$dir"
done
