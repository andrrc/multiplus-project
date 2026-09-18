import { Client } from "minio";
import { randomUUID } from "node:crypto";

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

export const LIMITE_IMAGEM_BYTES = 10 * 1024 * 1024;

export function detectarTipoImagem(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.slice(0, 8).every((byte, i) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i])) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function armazenarImagemComentario(file: File): Promise<{ chave: string; tipo: string }> {
  if (file.size > LIMITE_IMAGEM_BYTES) throw new Error("A imagem deve ter no máximo 10MB.");
  const dados = Buffer.from(await file.arrayBuffer());
  const tipo = detectarTipoImagem(dados);
  if (!tipo) throw new Error("Formato inválido. Use WebP, JPEG ou PNG.");
  await garantirBucketPrivado();
  const chave = `comentarios/${randomUUID()}.${tipo === "image/jpeg" ? "jpg" : tipo.split("/")[1]}`;
  await storage.putObject(bucket, chave, dados, dados.length, { "Content-Type": tipo });
  return { chave, tipo };
}

export async function removerImagemComentario(chave: string): Promise<void> {
  await storage.removeObject(bucket, chave);
}

export async function lerImagemComentario(chave: string): Promise<Buffer> {
  const stream = await storage.getObject(bucket, chave);
  const partes: Buffer[] = [];
  for await (const parte of stream) partes.push(Buffer.isBuffer(parte) ? parte : Buffer.from(parte));
  return Buffer.concat(partes);
}
