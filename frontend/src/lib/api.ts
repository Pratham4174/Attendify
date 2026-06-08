import type { ApiError, Session } from "../types";

export const API_BASE = "/api";

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export async function apiFetch<T>(session: Session, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new ApiRequestError(await extractError(response), response.status);
  }

  return (await response.json()) as T;
}

export async function apiFetchVoid(session: Session, path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new ApiRequestError(await extractError(response), response.status);
  }
}

export async function extractError(response: Response) {
  try {
    const body = (await response.json()) as ApiError;
    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}
