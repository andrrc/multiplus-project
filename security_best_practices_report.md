# Relatório de segurança — Múltiplus

Data: 2026-10-30

Escopo: revisão estática direcionada de autenticação, recuperação de senha, sessão, controles de acesso, armazenamento e configuração HTTP. Não é um teste de invasão nem uma verificação completa de todas as regras RLS, dependências ou ambientes implantados. Não foram realizadas tentativas contra contas ou serviços reais.

## Resumo executivo

Há fragilidades no ciclo de recuperação de senha e na proteção contra tentativas de autenticação concorrentes. As duas primeiras prioridades são garantir o uso único e atômico dos tokens e permitir a revogação de sessões após alterações de senha. A aplicação também possui controles úteis, como RLS, revalidação de perfil, limite de upload e cabeçalhos no Caddy; sua eficácia depende da configuração realmente implantada.

## Alta

### 1. Token de recuperação pode ser consumido mais de uma vez em concorrência

- **Regra:** NEXT-AUTH-001 / integridade de token de uso único.
- **Evidência:** `src/app/definir-senha/actions.ts:49` valida o token; nas linhas 62–70 calcula e altera a senha antes de marcá-lo como usado. `src/lib/tokens.ts:76` faz atualização incondicional pelo ID. Não há transação nem atualização condicional que reserve o token.
- **Impacto:** dois pedidos com o mesmo token válido podem passar pela validação antes do consumo e ambos alterar a senha; o último prevalece. A exploração requer acesso ao token válido e uma janela de concorrência.
- **Correção:** numa transação, consumir com condição `usadoEm IS NULL` e prazo válido, confirmar que exatamente uma linha foi atualizada e alterar a senha na mesma transação. Testar duas requisições concorrentes e falhas intermediárias. Verificar também concorrência na emissão de novos tokens (`src/lib/tokens.ts:29`).
- **Limite da evidência:** é uma condição de corrida inferida do código; não foi reproduzida em execução.

### 2. Alteração de senha não revoga sessões existentes

- **Regra:** NEXT-SESS-002.
- **Evidência:** `src/server/auth/config.ts:13` usa JWT; `src/server/auth/contexto.ts:18` reconsulta ID, estado ativo e perfil, sem versão de sessão. O reset em `src/app/definir-senha/actions.ts:65` altera o hash e não invalida JWTs. A troca normal em `src/lib/usuarios.ts:684` segue o mesmo padrão.
- **Impacto:** quem já tiver uma sessão válida pode continuar usando-a depois que o titular recuperar ou trocar a senha, até a expiração ou outra medida de invalidação.
- **Correção:** manter versão ou data de revogação de sessão no banco, incluí-la no JWT e verificá-la no servidor; incrementá-la ao trocar ou recuperar senha e, conforme política, ao desativar o usuário. Testar JWT anterior e sessão nova.
- **Limite da evidência:** não foi verificada uma camada externa de revogação; a conclusão se baseia na configuração e no contexto da aplicação.

### 3. Limite de login permite ultrapassagem por concorrência

- **Regra:** NEXT-AUTH-001 / proteção contra força bruta.
- **Evidência:** `src/server/auth/credentials.ts:51` consulta o contador antes da busca e verificação assíncronas; só registra falha nas linhas 70–79. Várias requisições simultâneas podem passar pela consulta antes de qualquer falha ser contabilizada.
- **Impacto:** um atacante pode enviar mais tentativas do que o limite anunciado por conta ou IP durante uma rajada paralela, reduzindo a proteção contra descoberta de senha.
- **Correção:** reservar/contabilizar tentativas atomicamente antes do trabalho assíncrono, com armazenamento compartilhado e limites de concorrência; definir cuidadosamente a política para tentativas bem-sucedidas. Testar requisições simultâneas.
- **Limite da evidência:** a possibilidade decorre da ordem do código; não foi feito teste de carga, e um limitador externo poderia reduzir o impacto.

## Média

### 4. Limitador em memória é volátil e não possui teto efetivo de chaves

- **Regra:** NEXT-AUTH-001 / disponibilidade.
- **Evidência:** `src/lib/rate-limit.ts:17` usa um `Map` por processo; `:36` e `:66` inserem chaves; a limpeza em `:41` e `:74` remove apenas entradas expiradas. A recuperação aceita e-mails arbitrários em `src/app/esqueci-senha/actions.ts:46` e cria uma chave por e-mail em `:52`.
- **Impacto:** reinício ou múltiplas instâncias fragmentam os limites. Muitas chaves distintas ainda não expiradas podem crescer a memória; a exploração depende da capacidade de tráfego e dos limites externos.
- **Correção:** usar limitador compartilhado com expiração e operações atômicas, limite de cardinalidade e proteção de tráfego no proxy. Testar muitas chaves, reinício e múltiplas instâncias.

### 5. CSP permite scripts inline

- **Regra:** NEXT-CSP-001 / JS-CSP-002.
- **Evidência:** `Caddyfile:17` contém `script-src 'self' 'unsafe-inline'`.
- **Impacto:** se outra falha permitir injeção de HTML, a política oferece menos proteção contra execução de script. Isso não demonstra uma falha XSS por si só.
- **Correção:** estudar CSP com nonce ou hashes, compatível com a renderização do Next.js; validar em modo de observação e cobrir páginas e fluxos antes de aplicar.
- **Limite da evidência:** não foi verificada a política efetiva do proxy externo, que pode divergir do Caddy do repositório.

## Condição de implantação a verificar

### 6. Conexão de aplicação admite fallback para role privilegiada

- **Regra:** NEXT-AUTH-001 / menor privilégio.
- **Evidência:** `src/lib/prisma-app.ts:18` usa `APP_DATABASE_URL ?? DATABASE_URL`. `docker-compose.yml:52–53` configura URLs distintas e indica `multiplus_app` para a aplicação; outras implantações podem divergir.
- **Impacto:** se a URL restrita estiver ausente e a URL alternativa usar role proprietária ou com bypass de RLS, consultas supostamente protegidas por RLS poderão ignorar essas políticas.
- **Correção:** falhar na inicialização quando a URL restrita estiver ausente e verificar a role efetiva e seus atributos no ambiente implantado. Adicionar teste de configuração sem expor credenciais.
- **Limite da evidência:** o Compose versionado fornece a URL restrita; não há evidência de que o fallback esteja em uso em staging ou produção.

## Controles observados e limites

- `src/server/auth/contexto.ts:7` revalida estado ativo e perfil no banco; as actions examinadas obtêm contexto ou exigem administrador.
- `src/app/api/comentarios/imagem/[id]/route.ts:11` exige contexto, consulta com RLS e envia `no-store` e `nosniff`. `src/lib/storage.ts` limita tamanho e verifica assinaturas de imagem.
- `Caddyfile:12` define cabeçalhos de segurança; a aplicação é interna no Compose versionado. Não foi inspecionada a configuração efetiva da VPS ou de proxy externo.
- Não foram executados testes automatizados, testes de concorrência, análise de dependências ou inspeção de segredos e histórico; outras vulnerabilidades podem existir. A inspeção de rotas e políticas não foi exaustiva.
