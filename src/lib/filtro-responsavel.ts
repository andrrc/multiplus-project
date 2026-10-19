export type OpcaoResponsavel = { valor: string; nome: string };

export type ResponsavelFiltro =
  | { tipo: "todos" }
  | { tipo: "sem" }
  | { tipo: "invalido" }
  | { tipo: "pessoa" | "usuario"; id: string };

export function interpretarResponsavel(valor?: string | string[]): ResponsavelFiltro {
  if (valor === undefined || valor === "") return { tipo: "todos" };
  if (valor === "sem") return { tipo: "sem" };
  if (typeof valor !== "string") return { tipo: "invalido" };
  const partes = /^(pessoa|usuario):([a-zA-Z0-9_-]{1,128})$/.exec(valor);
  if (!partes) return { tipo: "invalido" };
  return { tipo: partes[1] as "pessoa" | "usuario", id: partes[2] };
}

export function condicaoResponsavel(valor: string | string[] | undefined, campoPessoa: string, campoUsuario: string) {
  const filtro = interpretarResponsavel(valor);
  switch (filtro.tipo) {
    case "todos": return {};
    case "invalido": return { id: { in: [] as string[] } };
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
  const parametros = new URLSearchParams();
  for (const campo of ["cliente", "projeto", "tarefa", "responsavel"] as const) {
    if (valores[campo]) parametros.set(campo, valores[campo]);
  }
  if (incluirConcluidas && valores.mostrarConcluidas) parametros.set("todos", "1");
  const query = parametros.toString();
  return query ? `${rota}?${query}` : rota;
}
