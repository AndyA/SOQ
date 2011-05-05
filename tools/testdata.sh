#!/bin/bash

infile="$1"
if [ -z "$infile" ]; then
  echo "Usage: $0 <infile>"
  exit
fi

dir=$(dirname "$infile")
set -x
for q in {1,2,3,4,5,6,7,8,9,10}0; do
  convert "$infile" -quality $q "$dir/q$q.jpg"
done

# vim:ts=2:sw=2:sts=2:et:ft=sh

