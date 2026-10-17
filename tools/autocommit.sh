#!/bin/bash
# every 3 min: if new/changed sprite atlases, update engine unit list, commit + push
cd /workspace/heroes-clash
while true; do
  sleep 180
  if [ -n "$(git status --porcelain assets/spr)" ]; then
    sleep 20  # let pack finish writing pages
    python3 /workspace/spr/upd_engine.py > /dev/null
    node --check game3d.js || continue
    new=$(git status --porcelain assets/spr | grep -o '[A-Za-z]*\.json' | sed 's/.json//' | tr '\n' ' ')
    git add -A && git -c user.name=Merliniky -c user.email=Merliniky@users.noreply.github.com commit -qm "v16 wip: atlases $new" && \
    git -c credential.helper= -c credential.helper='!/usr/local/bin/gh auth git-credential' push -q && echo "$(date +%T) pushed $new" >> /workspace/spr/ac.log
  fi
  pgrep -f qp.sh >/dev/null || pgrep -f "render.py" >/dev/null || { echo "$(date +%T) idle exit" >> /workspace/spr/ac.log; exit; }
done
