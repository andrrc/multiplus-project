/**
 * RF-032 (B2) — limite de tentativas em memória, por chave e janela de tempo.
 *
 * Em memória porque o app roda como um processo único no VPS (Contabo + Caddy, ver
 * docker-compose.yml). Não é um limitador distribuído: reiniciar o container zera a
 * contagem, e uma segunda réplica teria a própria contagem. Isso é aceitável para o que
 * ele protege aqui — encarecer a varredura de e-mails no endpoint de recuperação de
 * senha —, e não serve para nada que dependa de contagem exata. Quando houver mais de uma
 * instância, isto vira uma tabela no Postgres com a mesma interface.
 */
type Registro = { contagem: number; expiraEm: number };

const globalParaRateLimit = globalThis as unknown as {
  rateLimitBuckets: Map<string, Registro> | undefined;
};

const buckets = (globalParaRateLimit.rateLimitBuckets ??= new Map<string, Registro>());

export type ResultadoRateLimit = { permitido: boolean; tentativasRestantes: number };

/**
 * Conta uma tentativa para `chave` e diz se ela cabe no limite. A janela é fixa (não
 * deslizante): a contagem zera inteira quando expira.
 */
export function registrarTentativa(
  chave: string,
  limite: number,
  janelaMs: number,
): ResultadoRateLimit {
  const agora = Date.now();
  const atual = buckets.get(chave);

  if (!atual || atual.expiraEm <= agora) {
    buckets.set(chave, { contagem: 1, expiraEm: agora + janelaMs });
    return { permitido: true, tentativasRestantes: limite - 1 };
  }

  atual.contagem += 1;

  // Varredura preguiçosa: sem isto o Map cresceria indefinidamente, já que a chave inclui
  // o e-mail digitado e qualquer um pode inventar e-mails novos à vontade.
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) {
      if (v.expiraEm <= agora) buckets.delete(k);
    }
  }

  return {
    permitido: atual.contagem <= limite,
    tentativasRestantes: Math.max(0, limite - atual.contagem),
  };
}

/** Só para os testes — zera o estado entre casos. */
export function limparRateLimit(): void {
  buckets.clear();
}
