# Último acesso dos usuários e filtro "Cadastro incompleto"

- **Data:** 2026-11-18
- **Status:** aguardando aprovação. Nada foi implementado.
- **Origem:** pedido do usuário em 2026-11-18, a partir das diferenças restantes entre os protótipos e o sistema ([planejamento](planejamento-diferencas-prototipos.md), perguntas 6 e 7). Protótipos: `telas-novas/sistema-gestao-multiplus/07-usuarios.html` (coluna "Último acesso") e `06-clientes.html` (situação "Cadastro incompleto").
- **Decisões já tomadas:** registrar a última vez que o usuário acessou; considerar cadastro incompleto o cliente **sem segmento ou sem cidade**.

São dois itens independentes, com tamanhos e riscos diferentes. Por isso vão em dois commits, o filtro primeiro.

## 1. Cadastro incompleto (classe A: sem dado novo e sem permissão nova)

### Regra
Um cliente é **incompleto** quando não tem segmento **ou** não tem cidade. Vazio e só espaços contam como ausente.

- `segmento` é texto obrigatório no banco, mas o formulário aceita deixá-lo em branco, e então fica guardado como texto vazio (RF-002d).
- `municipio` pode ser nulo ou vazio.
- Os dois já aparecem como "Não informado" em âmbar na lista; o filtro só junta os que têm essa marca.

### O que muda
- **Lista de Clientes:** novo botão de situação "Cadastro incompleto", com a contagem, ao lado de Todos, Com projeto ativo, Sem projeto ativo e Com atraso. Vai na URL como `?situacao=incompleto`, como os outros.
- **Cálculo:** função pura `clienteIncompleto` em `src/lib/` (com teste unitário) e aplicação na própria página, do mesmo jeito que "Com atraso". Os botões continuam contando sobre a lista já filtrada por busca, cidade, segmento e laudo.
- **Sem migration, sem consulta nova e sem mudança de permissão.** A lista continua restrita à administração.
- **Efeito do filtro de cidade:** ao escolher uma cidade, todos os clientes listados têm cidade; "Cadastro incompleto" nesse caso mostra só os sem segmento. É o comportamento esperado.

### Testes
- Unitário da regra: segmento vazio, cidade vazia, nula, só espaços, os dois preenchidos.
- Jornada de navegador (já existe a de Clientes): botão presente, contagem e filtro.
- Atualizar a documentação de [Clientes](../funcionalidades/clientes.md) e de [Interface](../funcionalidades/interface.md).

## 2. Último acesso (classe B: coluna nova, com cuidado de privacidade)

### O que será guardado
Uma coluna `ultimoAcessoEm` (data e hora, aceita nulo) na tabela `usuarios`. Guarda só o **último** momento, não um histórico de logins. Não guarda IP, aparelho nem local.

### Quando é gravado
No login que deu certo, dentro de `autenticarComCredenciais` (`src/server/auth/credentials.ts`), depois de a senha conferir e antes de devolver o usuário.

- A gravação não pode derrubar o login: se falhar, o login segue e o erro é registrado no servidor.
- Login recusado (senha errada, conta inativa, limite de tentativas) **não** grava.
- A autenticação usa a conexão de serviço, sem RLS, então não é preciso criar política de escrita nova.

**Limite conhecido:** a sessão é um JWT e dura vários dias. Quem continua logado e usando o sistema aparece com a data do **login**, não a do último uso. Para a Talita, "Último acesso" passa a significar "última vez que entrou".

**Alternativa, se isso não bastar:** gravar também a atividade, no máximo uma vez por hora, no ponto que já confere a sessão a cada página (`src/server/auth/contexto.ts`). Custa uma escrita a mais e mexe em permissão de escrita do próprio usuário, então só entra se a Talita achar o dado de login enganoso. **Recomendação:** começar pelo login.

### Quem vê
- **Só a administração**, na lista de Usuários (nova coluna "Último acesso") e na ficha do usuário. A lista e a consulta `listarUsuarios` já são restritas ao perfil `ADMIN`, na função e na política `usuarios_select`.
- O colaborador interno, o externo e o cliente **não** veem o último acesso de ninguém. O usuário comum vê apenas a própria linha, como hoje.
- O campo não sai em nenhuma outra consulta: conferir os `select` que devolvem `usuario` inteiro (`buscarUsuario` e similares) para não levar o campo a telas de outros perfis.
- A lista de Usuários já mostra clientes e externos (coluna "Empresa" e filtro por empresa), então o último acesso aparece para todos os perfis, só para a administração.

### Como aparece
- **Data e hora no horário de Brasília**, no formato já usado nos avisos (ver [padronização de horários](padronizacao-horarios-brasilia.md)).
- **Quem ainda não tem registro:**
  - convite pendente (sem senha definida): "Ainda não acessou";
  - já definiu a senha, mas entrou antes desta mudança: "Sem registro" (aparece até o próximo login).
- O que existe hoje não é preenchido retroativamente; não há como saber o último acesso antigo.

### Privacidade (LGPD)
É dado pessoal de uso do sistema. Fica restrito à administração, sem histórico e sem rastreio de local. Acrescentar o item em [pendências antes da produção](../pendencias-antes-producao.md): informar no aviso de privacidade que o sistema registra a data do último acesso.

### Banco
- Migration com a coluna `ultimoAcessoEm` em `usuarios`, sem valor padrão, com data posterior à última da `origin/staging` (hoje `20261117120000`).
- Sem RLS nova: a tabela já tem política. Conferir que a coluna não entra em nenhuma view ou `GRANT` de coluna que a exponha a outro perfil.
- O `ops/deploy.sh` aplica a migration na VPS; não rodar à mão.

### Testes
- **Integração:** login bem-sucedido grava a data; senha errada, conta inativa e conta sem senha não gravam; falha ao gravar não impede o login (mock do erro).
- **Permissão:** só `ADMIN` recebe `ultimoAcessoEm` em `listarUsuarios`; interno, externo e cliente não listam outros usuários (já garantido pela RLS, testar o perfil negado).
- **Unitário:** formatação (data de Brasília, "Ainda não acessou", "Sem registro").
- **Navegador:** a coluna aparece na lista de Usuários da administração e vira cartão a 375 px sem rolagem lateral.
- Atualizar a documentação de [Usuários](../funcionalidades/usuarios.md), de [Autenticação](../funcionalidades/autenticacao-acesso.md) e de [Interface](../funcionalidades/interface.md), e registrar a decisão em `docs/decisoes-desenvolvimento.md`.

## 3. Ordem de execução
1. Cadastro incompleto: um commit, sem migration.
2. Último acesso: um commit, com migration, depois do primeiro.
3. No fim, atualizar o [planejamento](planejamento-diferencas-prototipos.md): marcar os dois itens como feitos e corrigir o que ficou desatualizado (a lista de Usuários já mostra clientes e externos, com empresa e filtro por empresa).

## 4. Pontos para aprovação
1. **"Último acesso" = último login** (recomendado), em vez de também registrar a atividade. — **Resposta:** pendente.
2. **Visível só à administração.** — **Resposta:** pendente.
3. **Cadastro incompleto = sem segmento ou sem cidade**, como no protótipo. — **Resposta:** definido em 2026-11-18 (você).
