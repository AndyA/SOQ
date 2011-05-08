#!/bin/bash

set -x
infile="$1"
tag="slowmain"
dir="$(dirname "$infile")"

for b in 200 400 600 800 1000 1200 1400 1600; do
  out="$dir/q$b.mp4"
  tmp="$dir/q$b.tmp.mp4"
  if [ ! -f $out ]; then
    ffmpeg -y -i "$infile" \
      -acodec libfaac -ab 96k \
      -vcodec libx264 -vpre slow -vpre main -b ${b}k \
      -deinterlace -aspect 16:9 -threads 0 "$tmp" \
      && mv "$tmp" "$out"
  fi
done


# vim:ts=2:sw=2:sts=2:et:ft=sh

