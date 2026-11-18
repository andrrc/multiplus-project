-- Último acesso do usuário (protótipo 07-usuarios, coluna "Último acesso").
--
-- Guarda só o momento do último login bem-sucedido, sem histórico, IP nem aparelho. Nulo para quem
-- nunca entrou ou entrou antes desta coluna existir. A leitura por outras pessoas continua restrita
-- pela política `usuarios_select` (só a administração lista outros usuários); a gravação acontece na
-- autenticação, que usa a conexão de serviço, então nenhuma política nova é necessária.

ALTER TABLE "usuarios" ADD COLUMN "ultimoAcessoEm" TIMESTAMP(3);
