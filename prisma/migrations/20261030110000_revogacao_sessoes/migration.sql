-- RF-032/RF-042: versão incrementada na alteração de senha invalida sessões anteriores.
ALTER TABLE "usuarios" ADD COLUMN "versaoSessao" INTEGER NOT NULL DEFAULT 0;
