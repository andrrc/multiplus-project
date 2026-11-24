-- Só o autor (colaborador externo) retira o próprio pedido pendente. A administração não retira o pedido de
-- outra pessoa: ela recusa, com resposta obrigatória, e o autor é avisado. Parte do corpo de
-- cancelar_pedido_prazo em 20261124130000_pedidos_prazo; as permissões da função não mudam.
CREATE OR REPLACE FUNCTION cancelar_pedido_prazo(p_id TEXT)
RETURNS "pedidos_prazo" LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  atual "pedidos_prazo"%ROWTYPE;
  autor "usuarios"%ROWTYPE;
BEGIN
  SELECT * INTO autor FROM "usuarios"
  WHERE "id" = app_current_usuario_id() AND "ativo" AND "perfil" = 'ADMIN_EXTERNO' AND "perfil"::text = app_current_perfil();
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão para retirar este pedido.'; END IF;
  SELECT * INTO atual FROM "pedidos_prazo" WHERE "id" = p_id FOR UPDATE;
  IF NOT FOUND OR atual."solicitadoPorId" IS DISTINCT FROM autor."id"
  THEN RAISE EXCEPTION 'Sem permissão para retirar este pedido.'; END IF;
  IF atual."status" <> 'PENDENTE' THEN RAISE EXCEPTION 'O pedido já foi respondido ou retirado.'; END IF;

  UPDATE "pedidos_prazo" SET "status" = 'CANCELADO', "decididoPorId" = autor."id",
    "decididoPorNome" = autor."nome", "decididoEm" = CURRENT_TIMESTAMP
  WHERE "id" = p_id RETURNING * INTO atual;
  RETURN atual;
END;
$$;
