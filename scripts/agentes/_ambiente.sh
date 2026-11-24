#!/usr/bin/env bash
# Guarda de ambiente dos scripts de scripts/agentes/ (é lido com `.` pelos outros, não roda sozinho).
#
# Recusa rodar no WSL quando o repositório fica no Windows (caminho /mnt/...). No PowerShell, o comando `bash` é o do
# WSL, e não o Git Bash: o script criaria o worktree dentro do Linux (/root/...), sem node_modules, e o Git do
# Windows o veria como "prunable". Já aconteceu duas vezes.
#
# Um repositório que mora dentro do próprio WSL (fora de /mnt/) continua funcionando.

em_wsl() {
  [ -n "${WSL_DISTRO_NAME:-}" ] || grep -qi microsoft /proc/version 2>/dev/null
}

if em_wsl; then
  raiz_do_repositorio="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  case "$raiz_do_repositorio" in
    /mnt/*)
      cat >&2 <<EOF
Recusado: este script está rodando no WSL sobre um repositório do Windows ($raiz_do_repositorio).
Os worktrees iriam para dentro do Linux (/root/...), sem node_modules, e o Git do Windows não os enxergaria.

Rode pelo Git Bash:
  - abra um terminal "Git Bash" na pasta do projeto e repita o comando; ou
  - no PowerShell, chame o bash do Git explicitamente:
      & "C:\\Program Files\\Git\\bin\\bash.exe" scripts/agentes/<script>.sh <argumentos>
(No PowerShell, o comando "bash" sozinho abre o WSL.)
EOF
      exit 1
      ;;
  esac
fi
