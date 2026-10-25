import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details === undefined ? {} : { details }) },
    { status },
  );
}

export async function readJson(request: Request): Promise<unknown | NextResponse> {
  try {
    return await request.json();
  } catch {
    return jsonError("Body harus berupa JSON yang valid.", 400);
  }
}

export function validationError(error: z.ZodError) {
  return jsonError("Input tidak valid.", 400, error.issues);
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
