-- O sinal de tempo real passa a dizer se veio de uma criação (INSERT) ou de uma mudança de leitura (UPDATE).
-- Sem isso, um aviso antigo marcado como "não lido" era tratado como aviso novo e abria um toast.
-- Parte do corpo de 20261103110000_realtime_notificacoes; só acrescenta o campo `operacao` ao JSON.
CREATE OR REPLACE FUNCTION publicar_nova_notificacao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW."lida" THEN
    PERFORM pg_notify(
      'notificacoes_novas',
      json_build_object(
        'id', NEW."id",
        'usuarioId', NEW."usuarioId",
        'lida', NEW."lida",
        'criadaEm', NEW."criadaEm",
        'operacao', TG_OP
      )::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW."lida" IS DISTINCT FROM OLD."lida" THEN
    PERFORM pg_notify(
      'notificacoes_novas',
      json_build_object(
        'id', NEW."id",
        'usuarioId', NEW."usuarioId",
        'lida', NEW."lida",
        'criadaEm', NEW."criadaEm",
        'operacao', TG_OP
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;
