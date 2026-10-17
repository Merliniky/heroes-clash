#!/bin/bash
# single-instance (flock) loop: every 2 min, when no pack is running and atlases changed -> update engine list, commit, push
exec 9>/workspace/spr/autocommit.lock
flock -n 9 || { echo "$(date +%T) another autocommit running, exit" >> /workspace/spr/ac.log; exit 1; }
cd /workspace/heroes-clash
while true; do
  sleep 120
  pgrep -f pack15.py >/dev/null && continue
  if [ -n "$(git status --porcelain assets/spr)" ]; then
    new=$(git status --porcelain assets/spr | grep -o '[A-Za-z]*\.json' | sed 's/.json//' | tr '\n' ' ')
    git add assets/spr && git -c user.name=Merliniky -c user.email=Merliniky@users.noreply.github.com commit -qm "v21 wip: atlases $new" && \
    git -c credential.helper= -c credential.helper='!/usr/local/bin/gh auth git-credential' push -q && echo "$(date +%T) pushed $new" >> /workspace/spr/ac.log
  fi
  [ -s /workspace/spr/qp.txt ] || pgrep -f "render.py" >/dev/null || pgrep -f qp.sh >/dev/null || { echo "$(date +%T) idle exit" >> /workspace/spr/ac.log; exit; }
done
