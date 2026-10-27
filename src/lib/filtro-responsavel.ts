export type OpcaoResponsavel = { valor: string; nome: string };

export type ResponsavelFiltro =
  | { tipo: "todos" }
  | { tipo: "sem" }
  | { tipo: "invalido" }
  | { tipo: "pessoa" | "usuario"; id: string };

export function interpretarResponsavel(valor?: string | string[]): ResponsavelFiltro {
  // Ausência de filtro e campo vazio representam a opção geral.
  if (valor === undefined || valor === "") return { tipo: "todos" };
  if (valor === "sem") return { tipo: "sem" };
  // Parâmetros repetidos na URL chegam como lista e são recusados em vez de escolher um ao acaso.
  if (typeof valor !== "string") return { tipo: "invalido" };
  // O formato identifica a origem do responsável e limita o id a caracteres seguros.
  const partes = /^(pessoa|usuario):([a-zA-Z0-9_-]{1,128})$/.exec(valor);
  if (!partes) return { tipo: "invalido" };
  // A expressão regular já garantiu que o tipo e o identificador existem.
  return { tipo: partes[1] as "pessoa" | "usuario", id: partes[2] };
}

export function condicaoResponsavel(valor: string | string[] | undefined, campoPessoa: string, campoUsuario: string) {
  // Traduz o parâmetro da URL para a condição que o Prisma aplica na consulta.
  const filtro = interpretarResponsavel(valor);
  switch (filtro.tipo) {
    case "todos": return {};
    // Um filtro inválido deve retornar zero resultados, nunca remover o filtro silenciosamente.
    case "invalido": return { id: { in: [] as string[] } };
    // A ausência de vínculo exige que os dois campos de responsável estejam nulos.
    case "sem": return { [campoPessoa]: null, [campoUsuario]: null };
    case "pessoa": return { [campoPessoa]: filtro.id };
    case "usuario": return { [campoUsuario]: filtro.id };
  }
}

export type ValoresFiltrosListagens = {
  cliente: string;
  projeto: string;
  tarefa: string;
  responsavel: string;
  mostrarConcluidas: boolean;
};

export function urlFiltrosListagens(rota: string, valores: ValoresFiltrosListagens, incluirConcluidas: boolean) {
  // Só serializa filtros preenchidos; a ordem fixa torna a URL estável e legível.
  const parametros = new URLSearchParams();
  for (const campo of ["cliente", "projeto", "tarefa", "responsavel"] as const) {
    if (valores[campo]) parametros.set(campo, valores[campo]);
  }
  // O sinalizador só existe em telas que permitem incluir itens concluídos.
  if (incluirConcluidas && valores.mostrarConcluidas) parametros.set("todos", "1");
  // Evita o ponto de interrogação quando nenhum filtro foi selecionado.
  const query = parametros.toString();
  return query ? `${rota}?${query}` : rota;
}
