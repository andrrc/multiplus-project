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
        'criadaEm', NEW."criadaEm"
      )::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW."lida" IS DISTINCT FROM OLD."lida" THEN
    PERFORM pg_notify(
      'notificacoes_novas',
      json_build_object(
        'id', NEW."id",
        'usuarioId', NEW."usuarioId",
        'lida', NEW."lida",
        'criadaEm', NEW."criadaEm"
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION publicar_nova_notificacao() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publicar_nova_notificacao() TO multiplus_app;

CREATE TRIGGER notificacoes_publicar_nova
AFTER INSERT ON "notificacoes"
FOR EACH ROW
EXECUTE FUNCTION publicar_nova_notificacao();

CREATE TRIGGER notificacoes_publicar_leitura
AFTER UPDATE OF "lida" ON "notificacoes"
FOR EACH ROW
EXECUTE FUNCTION publicar_nova_notificacao();
