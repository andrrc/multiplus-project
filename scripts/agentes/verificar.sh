#!/usr/bin/env bash
# Verificações de entrega de uma tarefa de agente, rodadas na raiz do worktree.
#
# Uso:  bash scripts/agentes/verificar.sh [--completo]
#
# Sempre:     arquivos sensíveis fora do commit, typecheck, lint e testes unitários.
# --completo: também a suíte de integração e smoke e as jornadas de navegador, com uma TRAVA.
#
# Por que a trava: os bancos de teste têm nome fixo (multiplus_test e multiplus_test_e2e) e o Playwright usa a
# porta 3105. Dois agentes rodando essas suítes ao mesmo tempo apagam os dados um do outro. A trava fica na pasta
# comum do Git, que todos os worktrees compartilham, e é liberada ao fim (ou se o processo dono morrer).
set -uo pipefail

completo=0
[ "${1:-}" = "--completo" ] && completo=1

git rev-parse --git-dir >/dev/null 2>&1 || { echo "Rode dentro do repositório." >&2; exit 1; }
cd "$(git rev-parse --show-toplevel)"

falhas=()
passo() { printf '\n== %s\n' "$1"; }

# 1. Arquivos sensíveis ou gerados que não podem entrar na entrega (comparando com origin/staging e com a árvore).
passo "Arquivos sensíveis"
{ git diff --name-only origin/staging...HEAD 2>/dev/null; git status --porcelain | sed 's/^...//'; } | sort -u > /tmp/multiplus-arquivos-$$.txt
if grep -E '(^|/)\.env($|\.)|\.tgz$|\.tsbuildinfo$|^report/|\.pem$|\.local-admin-login' /tmp/multiplus-arquivos-$$.txt | grep -v '\.env\.example$'; then
  echo "Há arquivo sensível ou gerado na entrega (listado acima). Remova-o do commit."
  falhas+=("arquivos sensíveis")
else
  echo "ok"
fi
rm -f /tmp/multiplus-arquivos-$$.txt

executar() {
  local nome="$1"; shift
  passo "$nome"
  if "$@"; then echo "ok"; else falhas+=("$nome"); fi
}

executar "Typecheck" npm run typecheck
executar "Lint" npm run lint
executar "Testes unitários" npm run test:unit

if [ "$completo" -eq 1 ]; then
  trava="$(git rev-parse --git-common-dir)/multiplus-testes.lock"
  if mkdir "$trava" 2>/dev/null; then
    :
  else
    dono="$(cat "$trava/dono" 2>/dev/null || true)"
    pid="${dono%%|*}"
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "Trava antiga (processo $pid não existe mais); liberando."
      rm -rf "$trava"
      mkdir "$trava"
    else
      echo "Outra suíte de banco está rodando ($dono). Espere terminar e tente de novo." >&2
      exit 2
    fi
  fi
  echo "$$|$(pwd)|$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$trava/dono"
  trap 'rm -rf "$trava"' EXIT

  executar "Integração e smoke" npx vitest run
  # Na primeira execução, o servidor de desenvolvimento do Next costuma recusar subir por causa de um aviso de
  # vulnerabilidade e sair com erro (registrado em docs/pendencias-antes-producao.md). Uma falha real repete.
  navegador() { npm run test:browser || { echo "Repetindo as jornadas uma vez (recusa conhecida do servidor do Next)."; npm run test:browser; }; }
  executar "Jornadas no navegador" navegador
fi

printf '\n'
if [ "${#falhas[@]}" -eq 0 ]; then
  echo "Todas as verificações passaram."
  exit 0
fi
echo "Falharam: ${falhas[*]}"
echo "Confira se a falha já existia em origin/staging antes de tratá-la como regressão da tarefa."
exit 1
