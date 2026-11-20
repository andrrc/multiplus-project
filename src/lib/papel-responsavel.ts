import type { Perfil } from "@prisma/client";

/**
 * Papel do responsável de uma tarefa, para o texto abaixo do nome na lista (protótipo 03: "Colaborador externo").
 *
 * O responsável é uma pessoa da equipe (usuário, com perfil) ou uma pessoa envolvida do cliente. A pessoa envolvida
 * que tem acesso ao sistema entra como colaborador externo; a que não tem é apenas uma pessoa do cliente.
 */
const PAPEL_DO_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administração",
  ADMIN_INTERNO: "Colaborador interno",
  ADMIN_EXTERNO: "Colaborador externo",
  CLIENTE: "Cliente",
};

export function papelDoResponsavel(responsavel: {
  responsavel?: { temAcesso: boolean } | null;
  responsavelUsuario?: { perfil: Perfil } | null;
}): string | null {
  if (responsavel.responsavelUsuario) return PAPEL_DO_PERFIL[responsavel.responsavelUsuario.perfil];
  if (responsavel.responsavel) return responsavel.responsavel.temAcesso ? "Colaborador externo" : "Pessoa do cliente";
  return null;
}
