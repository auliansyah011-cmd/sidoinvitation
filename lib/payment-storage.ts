import { randomUUID } from "node:crypto";

const allowedProofTypes = {
  "image/jpeg": { extension: "jpg", magic: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", magic: (bytes: Uint8Array) => bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10" },
  "image/webp": { extension: "webp", magic: (bytes: Uint8Array) => String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP" },
  "application/pdf": { extension: "pdf", magic: (bytes: Uint8Array) => String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-" },
} as const;

export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

function storageConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !key || !bucket) {
    throw new Error(
      "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan SUPABASE_STORAGE_BUCKET wajib dikonfigurasi.",
    );
  }
  return { url: url.replace(/\/+$/, ""), key, bucket };
}

export function validateProofFile(file: File, bytes: Uint8Array) {
  if (file.size < 1 || file.size > MAX_PROOF_SIZE_BYTES) {
    throw new Error("Bukti pembayaran harus berukuran maksimal 5 MB.");
  }
  const type = allowedProofTypes[file.type as keyof typeof allowedProofTypes];
  if (!type) {
    throw new Error("Format bukti harus JPG, PNG, WebP, atau PDF.");
  }
  if (!type.magic(bytes)) {
    throw new Error("Isi file tidak cocok dengan format bukti yang dipilih.");
  }
  return type;
}

export function validatePaymentStorageConfiguration() {
  storageConfig();
}

function objectUrl(path: string) {
  const config = storageConfig();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodedPath}`;
}

export async function uploadPaymentProof(
  paymentId: string,
  file: File,
  bytes: Uint8Array,
) {
  const type = validateProofFile(file, bytes);
  const path = `payment-proofs/${paymentId}/${randomUUID()}.${type.extension}`;
  const config = storageConfig();
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const response = await fetch(objectUrl(path), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      apikey: config.key,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Supabase Storage upload failed.", { status: response.status });
    throw new Error("Gagal menyimpan bukti ke Supabase Storage.");
  }
  return { path, mimeType: file.type };
}

export async function deletePaymentProof(path: string) {
  const config = storageConfig();
  const response = await fetch(objectUrl(path), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.key}`,
      apikey: config.key,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Supabase Storage proof cleanup failed.", { status: response.status });
  }
}

export async function getPaymentProof(path: string) {
  const config = storageConfig();
  const response = await fetch(objectUrl(path), {
    headers: {
      Authorization: `Bearer ${config.key}`,
      apikey: config.key,
    },
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    console.error("Supabase Storage proof retrieval failed.", { status: response.status });
    throw new Error("Bukti pembayaran tidak dapat diambil dari penyimpanan.");
  }
  return response;
}

export function paymentAmount() {
  const amount = Number(process.env.INVITATION_PRICE_IDR);
  if (!Number.isSafeInteger(amount) || amount < 1000) {
    throw new Error("INVITATION_PRICE_IDR wajib diisi dengan angka minimal 1000.");
  }
  return amount;
}

export function transferAccount() {
  const bankName = process.env.TRANSFER_BANK_NAME;
  const accountName = process.env.TRANSFER_ACCOUNT_NAME;
  const accountNumber = process.env.TRANSFER_ACCOUNT_NUMBER;
  if (!bankName || !accountName || !accountNumber) {
    throw new Error(
      "TRANSFER_BANK_NAME, TRANSFER_ACCOUNT_NAME, dan TRANSFER_ACCOUNT_NUMBER wajib dikonfigurasi.",
    );
  }
  return { bankName, accountName, accountNumber };
}
