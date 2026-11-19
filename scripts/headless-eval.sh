#!/usr/bin/env bash
# Run one eval task unattended, three times, each in a fresh session, with hard limits.
# Usage: scripts/headless-eval.sh <task-number> "<prompt>" <context-label>
# Supports AI agent CLI execution with bounded budget and turn limits.
set -euo pipefail
task="$1"; prompt="$2"; ctx="${3:-baseline}"
AGENT_BIN="${AGENT_BIN:-agent}"
for run in 1 2 3; do
  git stash -u -q || true                     # start each run from the same clean tree
  out=$($AGENT_BIN -p "$prompt" \
          --allowedTools "Read,Grep,Glob,Edit,Write,Bash(npm test:*),Bash(npm run check:*)" \
          --permission-mode dontAsk \
          --max-turns 20 \
          --max-budget-usd 1.00 \
          --output-format json)
  turns=$(echo "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.num_turns??"")})')
  cost=$(echo "$out"  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.total_cost_usd??"")})')
  if npm test --silent >/dev/null 2>&1; then pass=1; else pass=0; fi
  echo "$(date +%F),$ctx,$task,$run,$pass,$turns,$cost,0" | tee -a evals/runs.csv
  git checkout -q . && git clean -fdq          # throw the run's changes away
done
