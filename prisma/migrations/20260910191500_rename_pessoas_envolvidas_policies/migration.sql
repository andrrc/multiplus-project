-- Cosmético: o RENAME de tabela da migration anterior não renomeia as policies que
-- apontam pra ela (continuam com o nome antigo "pessoas_operacional_*") — só troca de nome
-- pra não confundir debug futuro, o enforcement em si já funcionava sem isso.
ALTER POLICY "pessoas_operacional_select" ON "pessoas_envolvidas" RENAME TO "pessoas_envolvidas_select";
ALTER POLICY "pessoas_operacional_write" ON "pessoas_envolvidas" RENAME TO "pessoas_envolvidas_write";
