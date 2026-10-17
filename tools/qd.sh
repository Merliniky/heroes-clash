#!/bin/bash
# queue daemon: pops unit names from queue.txt (one per line, optional :ONLY), renders, then packs; logs to q.log
cd /workspace/spr
while true; do
  while pgrep -f "q.sh " >/dev/null; do sleep 5; done
  u=$(head -1 queue.txt 2>/dev/null)
  if [ -z "$u" ]; then sleep 10; continue; fi
  sed -i '1d' queue.txt
  n=${u%%:*}; o=""; [[ $u == *:* ]] && o=${u#*:}
  echo "START $n $o $(date +%T)" >> q.log
  ONLY=$o nice -n 5 /workspace/tools/blender-4.2.3-linux-x64/blender -b -P render.py -- job16.json $n > log_$n.txt 2>&1
  echo "END $n $(date +%T) $(grep DONE log_$n.txt)" >> q.log
  nice -n 5 python3 pack15.py $n >> q.log 2>&1
done
