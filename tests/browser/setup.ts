/** Prepara somente o banco exclusivo dos testes de navegador. */
import setup from "../integration/setup/global-setup";
import { Client } from "pg";
import { validarDestinosDeTeste, validarSeparacaoDeBancos } from "../integration/setup/banco-teste-seguro";

export default async function prepararBanco(): Promise<() => Promise<void>> {
  validarDestinosDeTeste(process.env.TEST_DATABASE_URL, process.env.TEST_APP_DATABASE_URL);
  validarSeparacaoDeBancos(process.env.TEST_DATABASE_URL!, [process.env.DATABASE_URL, process.env.APP_DATABASE_URL]);
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.pathname = "/postgres";
  url.search = "";
  const trava = new Client({ connectionString: url.toString() });
  await trava.connect();
  try {
    const resultado = await trava.query<{ obtida: boolean }>("SELECT pg_try_advisory_lock(19821107) AS obtida");
    if (!resultado.rows[0].obtida) throw new Error("Outra execução dos testes de navegador já está usando o banco de teste.");
    await setup();
    return async () => { await trava.end(); };
  } catch (erro) {
    await trava.end();
    throw erro;
  }
}
