import { Client } from "minio";

const bucket = process.env.MINIO_BUCKET ?? "multiplus-uploads";

/** Cliente S3 compatível para arquivos privados de comentários (ADR-003). */
export const storage = new Client({
  endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER ?? "multiplus",
  secretKey: process.env.MINIO_ROOT_PASSWORD ?? "",
});

/**
 * Garante o bucket sem torná-lo público. O MinIO cria buckets privados por padrão;
 * a política vazia é reaplicada para evitar que um ambiente restaurado herde acesso
 * anônimo por engano. A rota autenticada da aplicação será a única forma de leitura.
 */
export async function garantirBucketPrivado(): Promise<void> {
  if (!(await storage.bucketExists(bucket))) await storage.makeBucket(bucket, "us-east-1");
  await storage.setBucketPolicy(bucket, JSON.stringify({ Version: "2012-10-17", Statement: [] }));
}

export function nomeDoBucket(): string {
  return bucket;
}
