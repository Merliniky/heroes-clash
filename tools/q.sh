#!/bin/bash
# usage: q.sh unit[:ONLY] ...   renders sequentially, logs to q.log
cd /workspace/spr
for u in "$@"; do n=${u%%:*}; o=""; [[ $u == *:* ]] && o=${u#*:}
 echo "START $n $o $(date +%T)" >> q.log
 ONLY=$o /workspace/tools/blender-4.2.3-linux-x64/blender -b -P render.py -- job15.json $n > log_$n.txt 2>&1
 echo "END $n $(date +%T) $(grep DONE log_$n.txt)" >> q.log
done
