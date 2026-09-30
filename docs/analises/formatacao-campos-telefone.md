# Análise: padronização dos campos de telefone

- **Data:** 2026-09-30
- **Pedido original:** “Procure todos os campos para cadastrar telefone possivel e deixe no formato: (DDD) XXXXX-XXXX. Eu já tinha te pedido isso antes, mas ficou faltando alguns, por exemplo quando você vai cadastrar uma pessoa envolvida numa empresa, o campo de telefone fica estranho.”
- **Status:** aprovada em 2026-09-30

## 1. Escopo previsto

Padronizar a digitação e a apresentação dos números de celular em todos os campos editáveis encontrados. Todos os campos são exclusivamente para celular e devem aceitar 11 dígitos, no padrão `(DD) XXXXX-XXXX`:

- Cadastro e edição de cliente: Responsável Legal, Ponto de Contato e Pessoa Envolvida (pessoa ou empresa), inclusive edição de pessoas envolvidas na ficha do cliente.
- Cadastro/edição de usuário interno. Meu Perfil apenas exibe o telefone e não permite editá-lo.
- Qualquer outro formulário editável com campo de telefone encontrado durante a implementação.

Usar máscara visual progressiva exclusivamente no padrão de celular `(DD) XXXXX-XXXX`. Não aceitar números fixos de 10 dígitos. Não alterar permissões, mascaramento de dados, obrigatoriedade ou outros dados. Não há exclusão de cadastros nem alteração de schema prevista. A implementação também deve tratar números antigos sem máscara para evitar duplicar ou exibir pontuação incorreta.

## 2. Permissões

Sem mudança de permissões. A edição de cada telefone continuará sujeita às regras atuais dos respectivos módulos.

| Ação | ADMIN | ADMIN_INTERNO | ADMIN_EXTERNO | CLIENTE |
|---|---|---|---|---|
| Cadastrar/editar telefone de cliente e pessoas vinculadas | Sim | Não | Não | Não |
| Cadastrar/editar telefone de usuário interno | Sim | Não | Não | Não |
| Editar próprio telefone | Conforme fluxo atual de Meu Perfil | Conforme fluxo atual | Conforme fluxo atual | Conforme fluxo atual |
| Ver telefone de Responsável Legal/Ponto de Contato | Sim | Não (mascarado no banco) | Não | Não |

## 3. Dados

Sem novos campos, migration ou backfill planejados. A máscara deve aceitar entrada com ou sem pontuação, limitar a entrada a 11 dígitos válidos para celular brasileiro e evitar que caracteres de formatação sejam acumulados ao editar. A política de armazenamento (somente dígitos ou string formatada) precisa permanecer compatível com os consumidores e testes existentes; definir isso após inspeção do código antes de implementar.

## 4. Impacto em telas e funções existentes

Inventário inicial por busca de `telefone`, `celular` e `formatarTelefone`:

- `src/app/(painel)/clientes/novo/novo-cliente-form.tsx`: telefone do cliente PF e telefones das pessoas associadas.
- `src/app/(painel)/clientes/[id]/editar/editar-cliente-form.tsx`: Responsável Legal e Ponto de Contato.
- `src/app/(painel)/clientes/[id]/acoes-cliente.tsx`: cadastro de Pessoa Envolvida (inclui empresa envolvida; campo citado no pedido).
- `src/app/(painel)/clientes/[id]/page.tsx`: telefones apresentados na ficha e em pessoas envolvidas.
- `src/app/(painel)/usuarios/usuario-form.tsx`, `src/app/(painel)/usuarios/novo/actions.ts`, `src/app/(painel)/usuarios/[id]/editar/page.tsx` e `src/app/(painel)/usuarios/[id]/editar/actions.ts`: cadastro/edição do telefone do usuário.
- `src/app/(painel)/meu-perfil/page.tsx` e usos de `src/lib/formatacao.ts`: apresentação do telefone.
- `src/lib/clientes.ts`, `src/lib/usuarios.ts`, `src/lib/pessoas-envolvidas.ts`, `src/lib/heranca-pessoa.ts`, `src/lib/validacao-cliente.ts` e `src/lib/formatacao.ts`: persistência, regras e formatação afetadas a confirmar pelo rastreamento completo dos usos.
- Testes de cliente, usuários, pessoas envolvidas, perfil e smoke/integracão que assumem o valor armazenado.

PDDs de Clientes e Usuários não foram encontrados no diretório `docs/`; a documentação disponível é `docs/funcionalidades/clientes.md`, `docs/funcionalidades/usuarios.md`, o SRS e a identidade visual.

## 5. Riscos e segurança

| Risco | Mitigação | Teste que cobre |
|---|---|---|
| Campo esquecido em um dos formulários, especialmente empresa envolvida | Inventariar todos os inputs e usos de telefone e aplicar componente/máscara compartilhada | Casos unitários de formatação e smoke dos formulários relevantes |
| Máscara em duplicidade ou perda de dígitos ao editar dados existentes | Normalizar para dígitos antes de formatar; cobrir valores com e sem máscara | Testes unitários para entrada progressiva e round-trip |
| Alterar formato persistido e quebrar validação, herança, RLS ou fluxos existentes | Manter contrato atual de persistência, salvo necessidade identificada; testar serviços afetados | Testes unitários e integração/smoke existentes ajustados com asserções precisas |
| Telefone sensível ser revelado a perfis sem acesso por mudança de query ou resposta | Não alterar queries, seleção de campos nem RLS; manter mascaramento no backend | `cadastro-clientes-rls.integration.test.ts` |
| Número longo ou entrada não numérica causar overflow/exibição quebrada | Limitar dígitos no componente e validar no servidor quando aplicável | Testes unitários de limites e teste visual responsivo |

## 6. Casos-limite e estados

- Campo vazio, opcional ou obrigatório conforme regra existente.
- Digitação gradual e colagem de número com espaços, parênteses, hífen ou prefixo `+55`.
- Número móvel de 11 dígitos no formato pedido.
- Valor salvo sem máscara e valor já salvo com máscara.
- Entrada acima do limite e entrada com letras/símbolos.
- Edição e cópia/herança de Responsável Legal para Ponto de Contato.
- Uso em celular e desktop, sem alterar a disposição das telas.

## 7. Interface

Reaproveitar o estilo e os componentes existentes. Mostrar a máscara enquanto o usuário digita e apresentar o placeholder `(11) 99999-9999`. Não alterar cores ou layout além do necessário para manter consistência entre os campos. Conferir em 375 px e desktop.

## 8. Plano de testes

- Unitários para máscara progressiva, limite de dígitos, número móvel/fixo e valores com pontuação/prefixo.
- Testes unitários existentes de clientes/usuários para compatibilidade do valor enviado ao servidor.
- Smoke para cadastrar/editar Pessoa Envolvida do tipo empresa, Responsável Legal/Ponto de Contato, usuário e demais formulários impactados.
- Reexecutar o teste de integração de RLS para confirmar que a alteração não expõe telefone.
- Rodar a suíte completa conforme seção 5.4 do `AGENTS.md` antes de publicar.

## 9. Perguntas em aberto

1. Confirmar somente celular com 11 dígitos no padrão `(DD) XXXXX-XXXX`; números fixos não serão aceitos como entrada válida. — **Resposta:** sim, todos os campos são para celular, informado pelo usuário em 2026-09-30.
2. Confirmar o tratamento do prefixo internacional `+55`; proposta: removê-lo da exibição e manter os dígitos nacionais, sem rejeitar colagens com o prefixo. — **Resposta:** aprovado pelo usuário em 2026-09-30.
