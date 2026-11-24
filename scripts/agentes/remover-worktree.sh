#!/usr/bin/env bash
# Remove com segurança o worktree de uma tarefa de agente.
#
# Uso:  bash scripts/agentes/remover-worktree.sh <claude|codex> <id-da-tarefa> [--apagar-branch]
#
# Recusa remover quando:
#   - o worktree tem alterações não commitadas ou arquivos novos fora do .gitignore;
#   - a branch tem commits que ainda não estão em origin/staging (trabalho não integrado).
# Nunca usa --force. Com --apagar-branch, a branch só é apagada com `git branch -d`, que também recusa
# o que não foi integrado. O banco e os serviços compartilhados não são tocados.
set -euo pipefail

# Recusa rodar no WSL sobre um repositório do Windows (veja _ambiente.sh).
. "$(dirname "${BASH_SOURCE[0]}")/_ambiente.sh"

agente="${1:-}"
tarefa="${2:-}"
apagar_branch=0
[ "${3:-}" = "--apagar-branch" ] && apagar_branch=1

if [ -z "$agente" ] || [ -z "$tarefa" ]; then
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi
case "$agente" in claude|codex) ;; *) echo "Agente inválido: use claude ou codex." >&2; exit 1 ;; esac

git rev-parse --git-dir >/dev/null 2>&1 || { echo "Rode dentro do repositório." >&2; exit 1; }
raiz_worktrees="${MULTIPLUS_WORKTREES:-$HOME/multiplus-worktrees}"
branch="$agente/$tarefa"
destino="$raiz_worktrees/$agente-$tarefa"

# O Git lista os caminhos no formato do sistema (C:/... no Windows); show-toplevel devolve o mesmo formato.
destino_git="$(git -C "$destino" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$destino_git" ] || ! git worktree list --porcelain | grep -Fqx "worktree $destino_git"; then
  echo "Não encontrei o worktree $destino na lista do Git." >&2
  exit 1
fi

if [ -n "$(git -C "$destino" status --porcelain)" ]; then
  echo "Recusado: há alterações não commitadas em $destino. Commite, guarde ou descarte conscientemente antes." >&2
  git -C "$destino" status --short >&2
  exit 1
fi

git fetch origin --quiet
if git show-ref --verify --quiet "refs/heads/$branch"; then
  nao_integrados="$(git log --oneline origin/staging.."$branch" | wc -l | tr -d ' ')"
  if [ "$nao_integrados" != "0" ]; then
    echo "Recusado: $branch tem $nao_integrados commit(s) que ainda não estão em origin/staging." >&2
    echo "Integre por Pull Request (ou publique a branch) antes de remover o worktree." >&2
    exit 1
  fi
fi

git worktree remove "$destino_git"
echo "Worktree removido: $destino"

if [ "$apagar_branch" -eq 1 ]; then
  git branch -d "$branch"
else
  echo "A branch $branch foi mantida. Para apagá-la: git branch -d $branch"
fi
