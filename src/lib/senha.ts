import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Gera um hash bcrypt com custo 12; a senha original não é armazenada. */
export function hashSenha(senha: string): Promise<string> {
  // bcrypt inclui salt aleatório no hash e executa o cálculo de forma assíncrona.
  return bcrypt.hash(senha, SALT_ROUNDS);
}

/** Compara uma senha digitada com o hash salvo sem revelar a senha persistida. */
export function verificarSenha(senha: string, hash: string): Promise<boolean> {
  // bcrypt recupera os parâmetros do hash e retorna apenas se os valores correspondem.
  return bcrypt.compare(senha, hash);
}
