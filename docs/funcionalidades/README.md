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
| Tarefas | [`tarefas.md`](tarefas.md) | Documentado (piloto) |
| Subtarefas e etiquetas | `subtarefas.md` | Pendente |
| Projetos | `projetos.md` | Pendente |
| Clientes e pessoas envolvidas | `clientes.md` | Pendente |
| Usuários e atribuições | `usuarios.md` | Pendente |
| Autenticação e acesso | `autenticacao-acesso.md` | Pendente |
| Comentários e menções | `comentarios-mencoes.md` | Pendente |
| Agenda | `agenda.md` | Pendente |
| Notificações | `notificacoes.md` | Pendente |

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
