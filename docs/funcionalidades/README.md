# Funcionalidades do sistema, por módulo

Esta pasta descreve **o que o sistema faz hoje**, módulo por módulo. Ela é diferente dos
outros documentos:

| Documento | Responde |
|---|---|
| `docs/SRS_Multiplus_Software_v1.0.md` | O que o sistema **deveria** fazer (requisitos) |
| `docs/product-design-multiplus-*.md` | Como as telas foram **planejadas** |
| `docs/analises/<funcionalidade>.md` | O que foi **previsto** antes de implementar uma alteração |
| `docs/funcionalidades/<modulo>.md` | O que o sistema **faz agora**, e o histórico de cada alteração |

Quando o código e este documento divergirem, o documento está desatualizado. Corrija-o no
mesmo commit da alteração.

## Módulos

| Módulo | Arquivo | Situação |
|---|---|---|
| Clientes e pessoas envolvidas | [`clientes.md`](clientes.md) | Documentado |
| Projetos | [`projetos.md`](projetos.md) | Documentado |
| Tarefas | [`tarefas.md`](tarefas.md) | Documentado (modelo de referência) |
| Subtarefas e etiquetas | [`subtarefas.md`](subtarefas.md) | Documentado |
| Comentários e menções | [`comentarios-mencoes.md`](comentarios-mencoes.md) | Documentado |
| Agenda | [`agenda.md`](agenda.md) | Documentado |
| Notificações | [`notificacoes.md`](notificacoes.md) | Documentado |
| Usuários e atribuições | [`usuarios.md`](usuarios.md) | Documentado |
| Autenticação e acesso | [`autenticacao-acesso.md`](autenticacao-acesso.md) | Documentado |

## Limitações de maior prioridade

A lista completa está em cada módulo. Estas são as que afetam segurança ou funcionamento
básico:

| Módulo | Limitação |
|---|---|
| Autenticação | L2: login sem limite de tentativas |
| Tarefas e Notificações | L1: código pronto; ativação manual do cron na VPS pendente |
| Tarefas | L5: tarefa desativada não pode ser reativada pela interface |

## Perfis

| Perfil | Quem é | Alcance |
|---|---|---|
| `ADMIN` | Administradora (Talita) | Tudo |
| `ADMIN_INTERNO` | Colaborador interno | Projetos atribuídos a ele e o que estiver sob sua responsabilidade |
| `ADMIN_EXTERNO` | Colaborador externo | Tarefas atribuídas a ele e o que estiver sob sua responsabilidade |
| `CLIENTE` | Cliente final | Somente leitura do próprio cadastro |

## Formato de cada arquivo de módulo

1. **Visão geral:** o que é o módulo, em linguagem de negócio.
2. **Quem pode fazer o quê:** tabela perfil × ação.
3. **Funcionalidades:** uma seção por funcionalidade, cada uma com dois blocos.
   - **Como funciona:** para quem usa o sistema, sem termos técnicos.
   - **Detalhes técnicos:** regras (RF/RN), rotas, código principal e testes que cobrem.
4. **Limitações e pendências conhecidas:** o que não funciona como o esperado, ou ainda
   não existe.
5. **Histórico de alterações:** data, commit e resumo de cada mudança, com link para a
   análise quando houver.
