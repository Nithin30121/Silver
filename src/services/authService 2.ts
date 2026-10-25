// SILVESTO LUXE | Customer Authentication Service
// Talks to the Spring Boot backend under /api/auth. The login session itself lives in an
// HttpOnly cookie that the browser manages and JavaScript can never read. This module only
// handles the readable XSRF-TOKEN cookie (CSRF protection) and turns errors into messages.

import type { AuthUser } from '../types';

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** An error the UI can show: a general message plus optional per-field messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'X-XSRF-TOKEN';
const UNREACHABLE_MESSAGE = 'We could not reach the atelier just now. Please check your connection and try again.';
const SERVER_ERROR_MESSAGE = 'Our client service is briefly unavailable. Please try again shortly.';

function readCookie(name: string): string | null {
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...init.headers }
    });
  } catch {
    throw new ApiError(0, UNREACHABLE_MESSAGE);
  }
}

/** The server rotates this token on sign-in and sign-out, so it is read fresh before every POST. */
async function csrfToken(): Promise<string> {
  let token = readCookie(CSRF_COOKIE);
  if (!token) {
    await send('/api/auth/csrf', { method: 'GET' });
    token = readCookie(CSRF_COOKIE);
  }
  if (!token) {
    throw new ApiError(0, UNREACHABLE_MESSAGE);
  }
  return token;
}

async function postJson(path: string, body?: unknown): Promise<Response> {
  return send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: await csrfToken() },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

/** Reads the backend's problem-details JSON ({ title, detail, errors }) into an ApiError. */
async function toApiError(response: Response): Promise<ApiError> {
  if (response.status >= 500) {
    return new ApiError(response.status, SERVER_ERROR_MESSAGE);
  }
  try {
    const problem = await response.json();
    return new ApiError(response.status, problem.detail || SERVER_ERROR_MESSAGE, problem.errors || {});
  } catch {
    return new ApiError(response.status, SERVER_ERROR_MESSAGE);
  }
}

/** The signed-in customer, or null for a guest. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await send('/api/auth/me', { method: 'GET' });
  if (response.status === 401) return null;
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function signup(payload: SignupPayload): Promise<AuthUser> {
  const response = await postJson('/api/auth/signup', payload);
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const response = await postJson('/api/auth/login', payload);
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function logout(): Promise<void> {
  const response = await postJson('/api/auth/logout');
  if (!response.ok) throw await toApiError(response);
}
