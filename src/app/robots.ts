import type { MetadataRoute } from "next";

/** O painel é autenticado e não deve expor dados de clientes aos buscadores. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
