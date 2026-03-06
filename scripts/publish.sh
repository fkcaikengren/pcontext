#!/bin/bash

# 参考：https://ianm.com/posts/2025-08-18-setting-up-changesets-with-bun-workspaces
set -e
# 黑名单：跳过 web 项目
for dir in packages/*; do
  if [ "$(basename "$dir")" = "web" ]; then
    continue
  fi
  (cd "$dir" && bun publish || true)
done
changeset tag
