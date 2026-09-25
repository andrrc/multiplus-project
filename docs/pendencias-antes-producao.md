# Pendências antes da produção — Múltiplus Software

**Data da revisão:** 18/09/2026  
**Responsável:** André  
**Status:** sistema validado localmente; produção ainda não autorizada

Este checklist reúne o que precisa ser resolvido antes de disponibilizar o sistema com dados reais de clientes. A apresentação para a Talita pode ocorrer com o ambiente local atual, mas os itens marcados como bloqueadores precisam estar concluídos antes do go-live.

## Situação atual

- [x] Sprint 4A e 4B implementadas.
- [x] 198 testes passando: 125 de integração/smoke e 73 unitários.
- [x] Typecheck e build passando.
- [x] `/api/health` respondendo 200 localmente.
- [x] Postgres, MinIO, aplicação e Caddy funcionando em Docker local.
- [x] CI do GitHub Actions versionado.
- [ ] Não existe VPS de produção.
- [ ] Não existe backup automatizado validado.
- [ ] Resend ainda não está configurado: `RESEND_API_KEY` está vazia.
- [ ] Não existe restauração de backup testada em um ambiente separado.

## Bloqueadores de produção

### 1. VPS e domínio

- [ ] Contratar ou provisionar a VPS.
- [ ] Definir o domínio oficial e apontar o DNS para a VPS.
- [ ] Configurar firewall, acesso SSH por chave e usuário sem login root.
- [ ] Configurar atualizações de segurança do sistema operacional.
- [ ] Definir `APP_DOMAIN` e `AUTH_URL` com HTTPS real.
- [ ] Confirmar renovação automática dos certificados TLS do Caddy.
- [ ] Subir o `docker-compose.yml` em produção e validar os healthchecks.
- [ ] Configurar volume persistente para Postgres.
- [ ] Configurar volume persistente ou sincronização externa para imagens.

### 2. Banco de dados e migrations

- [ ] Definir como as migrations serão aplicadas em produção usando a role dona do banco, separada da role `multiplus_app`.
- [ ] Criar um serviço ou procedimento operacional de migration antes de subir uma nova versão.
- [ ] Fazer backup antes de cada migration que altere schema.
- [ ] Aplicar as migrations em uma base de staging antes da produção.
- [ ] Confirmar que a versão de produção está com todas as migrations aplicadas.
- [ ] Criar o usuário Administrador inicial de forma segura.
- [ ] Validar as políticas RLS em staging com os quatro perfis.
- [ ] Confirmar timezone do Postgres e do job diário de prazos.

### 3. Resend e e-mails

- [ ] Criar ou confirmar a conta Resend da Múltiplus.
- [ ] Verificar o domínio remetente no Resend.
- [ ] Configurar registros DNS SPF e DKIM fornecidos pelo Resend.
- [ ] Configurar DMARC em política inicialmente compatível com o domínio.
- [ ] Criar uma API key com o menor escopo necessário.
- [ ] Configurar `RESEND_API_KEY` somente no ambiente de produção, fora do Git.
- [ ] Configurar `EMAIL_FROM` com domínio verificado.
- [ ] Enviar e validar um convite, um aviso de prazo e um aviso de comentário.
- [ ] Confirmar que e-mail inválido, Resend indisponível e limite de envio não derrubam a ação principal.
- [ ] Definir quem monitora falhas de envio e onde os logs serão consultados.

**Estado atual:** as notificações in-app funcionam localmente; e-mails reais não devem ser demonstrados até a chave e o domínio estarem configurados.

### 4. Backup e restauração

- [ ] Escolher o destino externo do backup, preferencialmente R2/S3.
- [ ] Criar bucket privado exclusivo para backups.
- [ ] Criar credencial de backup separada da credencial da aplicação.
- [ ] Implementar `pg_dump` diário com data, hora e identificação do ambiente.
- [ ] Criptografar o backup antes do envio ou garantir criptografia no destino.
- [ ] Definir retenção: diários, semanais e mensais.
- [ ] Não armazenar backup somente na VPS ou no volume Docker.
- [ ] Registrar sucesso e falha do job de backup.
- [ ] Configurar alerta quando o backup não for criado.
- [ ] Fazer uma restauração completa em uma base isolada.
- [ ] Medir o tempo de restauração e registrar o procedimento.
- [ ] Repetir o teste de restauração periodicamente.

**Critério de aceite:** deve ser possível perder a base principal e reconstruir os dados a partir de um backup externo comprovadamente restaurável.

### 5. Imagens e MinIO/R2

- [ ] Definir se o MinIO será somente temporário ou se haverá sincronização definitiva para R2.
- [ ] Configurar bucket privado em produção.
- [ ] Configurar credenciais de storage fora do repositório.
- [ ] Confirmar limite de upload no Caddy e na aplicação.
- [ ] Confirmar que a rota autenticada impede acesso anônimo às imagens.
- [ ] Testar imagem de comentário com cada perfil de usuário.
- [ ] Definir backup e retenção das imagens.
- [ ] Testar comportamento quando o storage estiver indisponível.

### 6. Job diário de notificações

- [ ] Criar um scheduler real em produção para chamar `/api/jobs/notificacoes-prazo`.
- [ ] Configurar `CRON_SECRET` forte e exclusivo.
- [ ] Não deixar o endpoint acessível sem autenticação.
- [ ] Definir horário e timezone do disparo.
- [ ] Testar duas execuções no mesmo dia e confirmar que não há duplicidade.
- [ ] Monitorar falhas do job.
- [ ] Confirmar que tarefas, projetos e clientes desativados não geram avisos.

### 7. Segurança e configuração

- [ ] Gerar um `AUTH_SECRET` exclusivo para produção.
- [ ] Não reutilizar senhas do `.env` local.
- [ ] Armazenar secrets no ambiente da VPS ou em um secret manager.
- [ ] Confirmar que `.env` nunca entra no Git.
- [ ] Desabilitar exposição pública da porta do Postgres em produção.
- [ ] Restringir MinIO à rede interna sempre que possível.
- [ ] Confirmar HTTPS obrigatório e cookies seguros.
- [ ] Revisar usuários ativos, convites pendentes e acessos de teste antes da abertura.
- [ ] Confirmar política de troca de senha e desativação de usuários.
- [ ] Fazer revisão final de LGPD para dados de clientes e colaboradores externos.

### 8. CI/CD e operação

- [ ] Executar o GitHub Actions no repositório e confirmar o job verde.
- [ ] Confirmar que typecheck, lint, build e suíte completa bloqueiam deploy quando falham.
- [ ] Configurar secrets de deploy somente quando a VPS existir.
- [ ] Definir procedimento de rollback da aplicação.
- [ ] Definir procedimento de rollback de migration; migrations destrutivas não podem ser aplicadas sem plano de recuperação.
- [ ] Confirmar que o deploy chama `/api/health` depois da atualização.
- [ ] Configurar UptimeRobot ou monitor equivalente para `/api/health`.
- [ ] Definir quem recebe alertas de queda, backup, job e e-mail.
- [ ] Registrar versão implantada e horário de cada deploy.

### 9. Aceite final com a Talita

- [ ] Administrador cria cliente, projeto, tarefa recorrente e checklist.
- [ ] Colaborador conclui uma tarefa e a próxima ocorrência aparece corretamente.
- [ ] Painel de Subtarefas calcula o percentual em dia.
- [ ] Agenda mostra ocorrências materializadas e projetadas sem duplicação.
- [ ] Comentário com imagem respeita as permissões.
- [ ] Notificação in-app aparece e pode ser marcada como lida.
- [ ] E-mail de teste chega ao destinatário correto, se o Resend já estiver configurado.
- [ ] Projeto desativado deixa de aparecer nos indicadores, agenda e notificações.
- [ ] Acesso direto por URL é negado para perfis sem permissão.
- [ ] Talita aprova formalmente o escopo e os fluxos da Sprint 4.

## Ordem recomendada

1. VPS, domínio, HTTPS e secrets de produção.
2. Banco de staging e procedimento de migrations.
3. Resend e teste de e-mails.
4. Backup externo e restauração de teste.
5. Storage de imagens e scheduler de notificações.
6. CI/CD, monitoramento e rollback.
7. Aceite final com a Talita.

## Go-live: decisão

O sistema só deve ser considerado pronto para produção quando os itens das seções 1 a 8 estiverem concluídos e houver evidência do aceite da seção 9. Sem backup restaurável, HTTPS, migrations controladas e secrets configurados, a decisão deve ser **não liberar dados reais**.
