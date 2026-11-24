#!/usr/bin/env bash
# Cria uma branch e um worktree isolados para um agente (Claude Code ou Codex) trabalhar em uma tarefa.
#
# Uso:  bash scripts/agentes/novo-worktree.sh <claude|codex> <id-da-tarefa> [--base origin/staging] [--sem-instalar] [--simular]
#
# O que faz:
#   1. confere o agente, o id e se a branch e a pasta ainda não existem;
#   2. busca o remoto (git fetch, sem alterar nada local);
#   3. cria a branch <agente>/<id-da-tarefa> a partir da base (padrão: origin/staging) e o worktree;
#   4. copia o .env deste checkout (o arquivo não é versionado e nunca é impresso) e instala as dependências.
#
# O que NÃO faz: não apaga nada, não mexe em branches existentes, não faz commit nem push.
# Os worktrees ficam FORA do projeto (padrão: ~/multiplus-worktrees, ou a pasta de MULTIPLUS_WORKTREES),
# porque o projeto fica no OneDrive e uma pasta node_modules ali seria sincronizada à toa.
set -euo pipefail

# Recusa rodar no WSL sobre um repositório do Windows (veja _ambiente.sh).
. "$(dirname "${BASH_SOURCE[0]}")/_ambiente.sh"

uso() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-1}"
}

agente=""
tarefa=""
base="origin/staging"
instalar=1
simular=0

while [ $# -gt 0 ]; do
  case "$1" in
    --base) base="${2:-}"; shift 2 ;;
    --sem-instalar) instalar=0; shift ;;
    --simular) simular=1; shift ;;
    -h|--help) uso 0 ;;
    -*) echo "Opção desconhecida: $1" >&2; uso 1 ;;
    *)
      if [ -z "$agente" ]; then agente="$1"
      elif [ -z "$tarefa" ]; then tarefa="$1"
      else echo "Argumento a mais: $1" >&2; uso 1
      fi
      shift ;;
  esac
done

[ -n "$agente" ] && [ -n "$tarefa" ] || uso 1
case "$agente" in claude|codex) ;; *) echo "Agente inválido: use claude ou codex." >&2; exit 1 ;; esac
if ! printf '%s' "$tarefa" | grep -Eq '^[a-z0-9][a-z0-9-]{1,40}$'; then
  echo "Id de tarefa inválido: use letras minúsculas, números e hífens (2 a 41 caracteres), por exemplo etapa2-prazo." >&2
  exit 1
fi

git rev-parse --git-dir >/dev/null 2>&1 || { echo "Rode dentro do repositório." >&2; exit 1; }
# O primeiro worktree listado é sempre o checkout principal.
principal="$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -n 1)"
raiz_worktrees="${MULTIPLUS_WORKTREES:-$HOME/multiplus-worktrees}"
branch="$agente/$tarefa"
destino="$raiz_worktrees/$agente-$tarefa"

echo "Checkout principal : $principal"
echo "Branch             : $branch (a partir de $base)"
echo "Worktree           : $destino"

if [ -n "$(git status --porcelain)" ]; then
  echo "Aviso: este checkout tem alterações não commitadas. Elas não vão para o worktree novo, e nada é descartado." >&2
fi

if git show-ref --verify --quiet "refs/heads/$branch"; then
  echo "Erro: a branch $branch já existe. Escolha outro id ou use o worktree que já existe." >&2
  exit 1
fi
if [ -e "$destino" ]; then
  echo "Erro: a pasta $destino já existe." >&2
  exit 1
fi

if [ "$simular" -eq 1 ]; then
  echo "[simulação] git fetch origin"
  echo "[simulação] git worktree add --no-track -b $branch \"$destino\" $base"
  [ -f "$principal/.env" ] && echo "[simulação] copiar o .env do checkout principal"
  [ "$instalar" -eq 1 ] && echo "[simulação] npm ci && npx prisma generate"
  exit 0
fi

git fetch origin
git rev-parse --verify --quiet "$base^{commit}" >/dev/null || { echo "Erro: a base $base não existe." >&2; exit 1; }

mkdir -p "$raiz_worktrees"
# --no-track: a branch nova NÃO herda origin/staging como upstream. Sem isso, um `git push` dela iria direto
# para a staging (e dispararia o deploy). A publicação é sempre explícita: git push -u origin <branch>.
git worktree add --no-track -b "$branch" "$destino" "$base"

if [ -f "$principal/.env" ]; then
  cp "$principal/.env" "$destino/.env"
  echo ".env copiado do checkout principal (não versionado)."
else
  echo "Aviso: não achei .env no checkout principal; crie o do worktree a partir de .env.example." >&2
fi

if [ "$instalar" -eq 1 ]; then
  (cd "$destino" && npm ci && npx prisma generate)
fi

cat <<EOF

Pronto. Próximos passos:
  cd "$destino"
  # Claude Code:  claude
  # Codex:        codex
Antes de rodar integração ou navegador, leia a seção "Banco e portas" em docs/colaboracao-multiagente.md
e use: bash scripts/agentes/verificar.sh --completo
Ao terminar: bash scripts/agentes/remover-worktree.sh $agente $tarefa
EOF
