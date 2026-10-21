-- CreateEnum
CREATE TYPE "TipoLaudoTecnico" AS ENUM ('AMBIENTAL', 'RURAL', 'AGROAMBIENTAL');

-- CreateTable
CREATE TABLE "laudos_tecnicos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLaudoTecnico" NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "desativadoEm" TIMESTAMP(3),
    "desativadoPor" TEXT,

    CONSTRAINT "laudos_tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anotacoes_laudo_tecnico" (
    "id" TEXT NOT NULL,
    "laudoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL DEFAULT '',
    "autorId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "desativadoEm" TIMESTAMP(3),
    "desativadoPor" TEXT,

    CONSTRAINT "anotacoes_laudo_tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links_anotacao_laudo_tecnico" (
    "id" TEXT NOT NULL,
    "anotacaoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "links_anotacao_laudo_tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "laudos_tecnicos_clienteId_key" ON "laudos_tecnicos"("clienteId");

-- CreateIndex
CREATE INDEX "anotacoes_laudo_tecnico_laudoId_criadoEm_id_idx" ON "anotacoes_laudo_tecnico"("laudoId", "criadoEm", "id");

-- CreateIndex
CREATE INDEX "links_anotacao_laudo_tecnico_anotacaoId_ordem_idx" ON "links_anotacao_laudo_tecnico"("anotacaoId", "ordem");

-- AddForeignKey
ALTER TABLE "laudos_tecnicos" ADD CONSTRAINT "laudos_tecnicos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos_tecnicos" ADD CONSTRAINT "laudos_tecnicos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacoes_laudo_tecnico" ADD CONSTRAINT "anotacoes_laudo_tecnico_laudoId_fkey" FOREIGN KEY ("laudoId") REFERENCES "laudos_tecnicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacoes_laudo_tecnico" ADD CONSTRAINT "anotacoes_laudo_tecnico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links_anotacao_laudo_tecnico" ADD CONSTRAINT "links_anotacao_laudo_tecnico_anotacaoId_fkey" FOREIGN KEY ("anotacaoId") REFERENCES "anotacoes_laudo_tecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RF-051: dados do laudo são privados do ADMIN, inclusive para o responsável.
-- As proteções abaixo são anexadas após a criação das tabelas.
ALTER TABLE laudos_tecnicos ADD CONSTRAINT laudo_nome_valido CHECK (length(trim(nome)) > 0);
ALTER TABLE links_anotacao_laudo_tecnico ADD CONSTRAINT laudo_link_http CHECK (url ~* '^https?://[^[:space:]]+$');

ALTER TABLE laudos_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes_laudo_tecnico ENABLE ROW LEVEL SECURITY;
ALTER TABLE links_anotacao_laudo_tecnico ENABLE ROW LEVEL SECURITY;
CREATE POLICY laudo_admin ON laudos_tecnicos FOR ALL TO multiplus_app
  USING (app_current_perfil() = 'ADMIN' AND app_current_usuario_id() IS NOT NULL)
  WITH CHECK (app_current_perfil() = 'ADMIN' AND app_current_usuario_id() IS NOT NULL);
CREATE POLICY anotacao_laudo_admin ON anotacoes_laudo_tecnico FOR ALL TO multiplus_app
  USING (app_current_perfil() = 'ADMIN' AND app_current_usuario_id() IS NOT NULL)
  WITH CHECK (app_current_perfil() = 'ADMIN' AND app_current_usuario_id() IS NOT NULL);
CREATE POLICY link_laudo_admin ON links_anotacao_laudo_tecnico FOR ALL TO multiplus_app
  USING (app_current_perfil() = 'ADMIN' AND app_current_usuario_id() IS NOT NULL)
  WITH CHECK (app_current_perfil() = 'ADMIN' AND app_current_usuario_id() IS NOT NULL);
GRANT SELECT, INSERT, UPDATE ON laudos_tecnicos, anotacoes_laudo_tecnico TO multiplus_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON links_anotacao_laudo_tecnico TO multiplus_app;
REVOKE DELETE ON laudos_tecnicos, anotacoes_laudo_tecnico FROM multiplus_app;

CREATE FUNCTION proteger_laudo_tecnico() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- A role dona é usada exclusivamente por migrations/fixtures; runtime usa multiplus_app.
  IF current_user <> 'multiplus_app' THEN RETURN NEW; END IF;
  IF NOT cliente_esta_ativo(NEW."clienteId") THEN RAISE EXCEPTION 'Cliente desativado: laudo somente leitura.'; END IF;
  PERFORM 1 FROM clientes WHERE id = NEW."clienteId" FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    IF NEW."clienteId" IS DISTINCT FROM OLD."clienteId" OR NEW.id IS DISTINCT FROM OLD.id OR NEW."criadoEm" IS DISTINCT FROM OLD."criadoEm" THEN
      RAISE EXCEPTION 'Vínculo do laudo não pode ser alterado.';
    END IF;
    IF NEW.versao <> OLD.versao + 1 THEN RAISE EXCEPTION 'Conflito de versão do laudo.'; END IF;
    IF NOT OLD.ativo AND (NOT NEW.ativo OR ROW(NEW.nome, NEW.tipo, NEW."responsavelId") IS DISTINCT FROM ROW(OLD.nome, OLD.tipo, OLD."responsavelId")) THEN
      RAISE EXCEPTION 'Laudo desativado: reative antes de editar.';
    END IF;
  ELSIF NEW.versao <> 1 THEN RAISE EXCEPTION 'Versão inicial do laudo inválida.';
  END IF;
  IF TG_OP = 'INSERT' OR NEW."responsavelId" IS DISTINCT FROM OLD."responsavelId" THEN
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = NEW."responsavelId" AND ativo AND perfil IN ('ADMIN','ADMIN_INTERNO')) THEN
      RAISE EXCEPTION 'Responsável deve ser integrante ativo da equipe interna.';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    NEW."desativadoEm" := CASE WHEN NEW.ativo THEN NULL ELSE CURRENT_TIMESTAMP END;
    NEW."desativadoPor" := CASE WHEN NEW.ativo THEN NULL ELSE app_current_usuario_id() END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger_laudo BEFORE INSERT OR UPDATE ON laudos_tecnicos FOR EACH ROW EXECUTE FUNCTION proteger_laudo_tecnico();

CREATE FUNCTION proteger_anotacao_laudo() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE pai laudos_tecnicos;
BEGIN
  IF current_user <> 'multiplus_app' THEN RETURN NEW; END IF;
  SELECT * INTO pai FROM laudos_tecnicos WHERE id = NEW."laudoId" FOR UPDATE;
  IF pai.id IS NULL OR NOT pai.ativo OR NOT cliente_esta_ativo(pai."clienteId") THEN
    RAISE EXCEPTION 'Cliente ou laudo desativado: anotação somente leitura.';
  END IF;
  PERFORM 1 FROM clientes WHERE id = pai."clienteId" FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW."autorId" IS DISTINCT FROM app_current_usuario_id() OR NEW.versao <> 1 THEN RAISE EXCEPTION 'Autor ou versão da anotação inválido.'; END IF;
  ELSE
    IF NEW."laudoId" IS DISTINCT FROM OLD."laudoId" OR NEW."autorId" IS DISTINCT FROM OLD."autorId" OR NEW.id IS DISTINCT FROM OLD.id OR NEW."criadoEm" IS DISTINCT FROM OLD."criadoEm" THEN
      RAISE EXCEPTION 'Vínculo e autor da anotação não podem ser alterados.';
    END IF;
    IF NEW.versao <> OLD.versao + 1 THEN RAISE EXCEPTION 'Conflito de versão da anotação.'; END IF;
    IF NOT OLD.ativo AND (NOT NEW.ativo OR NEW.texto IS DISTINCT FROM OLD.texto) THEN RAISE EXCEPTION 'Anotação desativada: reative antes de editar.'; END IF;
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
      NEW."desativadoEm" := CASE WHEN NEW.ativo THEN NULL ELSE CURRENT_TIMESTAMP END;
      NEW."desativadoPor" := CASE WHEN NEW.ativo THEN NULL ELSE app_current_usuario_id() END;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger_anotacao_laudo BEFORE INSERT OR UPDATE ON anotacoes_laudo_tecnico FOR EACH ROW EXECUTE FUNCTION proteger_anotacao_laudo();

CREATE FUNCTION proteger_link_laudo() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE anotacao_id text; pode boolean;
BEGIN
  IF current_user <> 'multiplus_app' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  anotacao_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."anotacaoId" ELSE NEW."anotacaoId" END;
  IF TG_OP = 'UPDATE' AND NEW."anotacaoId" IS DISTINCT FROM OLD."anotacaoId" THEN RAISE EXCEPTION 'Vínculo do link não pode ser alterado.'; END IF;
  SELECT a.ativo AND l.ativo AND cliente_esta_ativo(l."clienteId") INTO pode
    FROM anotacoes_laudo_tecnico a JOIN laudos_tecnicos l ON l.id = a."laudoId" WHERE a.id = anotacao_id FOR UPDATE OF a, l;
  IF pode IS DISTINCT FROM true THEN RAISE EXCEPTION 'Anotação desativada: link somente leitura.'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER proteger_link_laudo BEFORE INSERT OR UPDATE OR DELETE ON links_anotacao_laudo_tecnico FOR EACH ROW EXECUTE FUNCTION proteger_link_laudo();

-- Validação diferida permite criar anotação só com links na mesma transação.
CREATE FUNCTION validar_conteudo_anotacao_laudo() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE anotacao_id text;
BEGIN
  IF current_user <> 'multiplus_app' THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'anotacoes_laudo_tecnico' THEN anotacao_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN anotacao_id := OLD."anotacaoId";
  ELSE anotacao_id := NEW."anotacaoId"; END IF;
  IF EXISTS (SELECT 1 FROM anotacoes_laudo_tecnico a WHERE a.id = anotacao_id AND trim(a.texto) = ''
    AND NOT EXISTS (SELECT 1 FROM links_anotacao_laudo_tecnico l WHERE l."anotacaoId" = a.id)) THEN
    RAISE EXCEPTION 'Escreva uma anotação ou inclua um link.';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER conteudo_anotacao_laudo AFTER INSERT OR UPDATE ON anotacoes_laudo_tecnico DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_conteudo_anotacao_laudo();
CREATE CONSTRAINT TRIGGER conteudo_link_laudo AFTER INSERT OR UPDATE OR DELETE ON links_anotacao_laudo_tecnico DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_conteudo_anotacao_laudo();
REVOKE ALL ON FUNCTION proteger_laudo_tecnico(), proteger_anotacao_laudo(), proteger_link_laudo(), validar_conteudo_anotacao_laudo() FROM PUBLIC;
