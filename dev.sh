#!/bin/bash
NODE_OPTIONS='--no-deprecation --no-warnings' nuxt dev 2>&1 | while IFS= read -r line; do
  if [[ ! "$line" =~ "spawn EBADF" ]]; then
    echo "$line"
  fi
done
