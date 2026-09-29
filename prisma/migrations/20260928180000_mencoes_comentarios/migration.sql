ALTER TABLE "comentarios"
ADD COLUMN "mencoesUsuarioIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
