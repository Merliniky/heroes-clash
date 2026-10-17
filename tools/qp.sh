#!/bin/bash
# parallel worker: pops units from qp.txt (flock), renders full + packs; log qp.log
cd /workspace/spr
while true; do
  u=$(flock qp.lock bash -c 'u=$(head -1 qp.txt); [ -n "$u" ] && sed -i 1d qp.txt; echo $u')
  [ -z "$u" ] && break
  t0=$(date +%s); echo "START $u $(date +%T)" >> qp.log
  /workspace/tools/blender-4.2.3-linux-x64/blender -b -P render.py -- job16.json $u > log_$u.txt 2>&1
  flock pack.lock python3 pack15.py $u >> qp.log 2>&1
  echo "END $u $(date +%T) $(( $(date +%s)-t0 ))s" >> qp.log
done
