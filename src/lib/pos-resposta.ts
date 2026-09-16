import { after } from "next/server";

/**
 * Trabalho que não deve entrar na conta do tempo de resposta.
 *
 * Existe por causa do RF-032: o endpoint de recuperação de senha devolve a mesma mensagem
 * para e-mail cadastrado e não cadastrado, mas **o tempo** entregava a diferença. O caminho
 * do e-mail existente gravava um token e esperava o POST ao Resend (centenas de
 * milissegundos); o do inexistente voltava depois de um único SELECT. Dava para enumerar
 * contas com um cronômetro, o que devolve pela porta de trás exatamente o que a mensagem
 * neutra e o limite por IP protegem.
 *
 * `after` (next/server) é a API desta versão do Next para isso: roda o callback depois que a
 * resposta é finalizada, e o runtime mantém o trabalho vivo até terminar — ao contrário de
 * uma promessa solta, que pode ser cortada junto com a invocação. Ela roda mesmo quando a
 * resposta não completa com sucesso, inclusive em `redirect` (ver
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md).
 *
 * Erro dentro da tarefa nunca sobe: quem chamou já respondeu, e derrubar a requisição depois
 * do fato não ajudaria ninguém. Fica no log, no mesmo espírito do `catch` de
 * `src/lib/convites.ts`, onde falha de e-mail também não é fatal.
 */
const pendentes = new Set<Promise<void>>();

export function agendarPosResposta(nome: string, tarefa: () => Promise<void>): void {
  const executar = async () => {
    try {
      await tarefa();
    } catch (erro) {
      console.error(`[pos-resposta] ${nome} falhou:`, erro);
    }
  };

  try {
    after(executar);
    return;
  } catch {
    // `after` exige escopo de requisição e **lança** fora de um. É o que acontece nos testes,
    // que chamam a Server Action diretamente, sem request. Nesse caso a tarefa vira promessa
    // solta — e fica rastreada, para o teste poder esperar por ela em vez de correr com ela.
  }

  const promessa = executar();
  pendentes.add(promessa);
  void promessa.finally(() => pendentes.delete(promessa));
}

/**
 * Só para os testes: espera o que foi agendado fora de um escopo de requisição.
 *
 * Em produção não faz nada, porque ali quem segura o trabalho é o `after` do Next. O laço
 * cobre o caso de uma tarefa agendar outra.
 */
export async function aguardarPosResposta(): Promise<void> {
  while (pendentes.size > 0) {
    await Promise.all([...pendentes]);
  }
}
