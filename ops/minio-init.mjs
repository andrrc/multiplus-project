import { Client } from "minio";

const bucket = process.env.MINIO_BUCKET;
if (!bucket) throw new Error("MINIO_BUCKET is required");

const client = new Client({
  endPoint: process.env.MINIO_ENDPOINT ?? "minio",
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
});

let ultimoErro;
for (let tentativa = 1; tentativa <= 30; tentativa += 1) {
  try {
    if (!(await client.bucketExists(bucket))) await client.makeBucket(bucket, "us-east-1");
    ultimoErro = undefined;
    break;
  } catch (erro) {
    ultimoErro = erro;
    if (!['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED'].includes(erro?.code) || tentativa === 30) throw erro;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
if (ultimoErro) throw ultimoErro;
await client.setBucketPolicy(bucket, JSON.stringify({ Version: "2012-10-17", Statement: [] }));
console.log(`Bucket privado pronto: ${bucket}`);
