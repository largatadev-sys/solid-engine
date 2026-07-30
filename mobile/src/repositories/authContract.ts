

import type { AuthRepository } from './authRepository';


export class AuthCancelled extends Error {
  constructor() {
    super('Sign-in was cancelled.');
    this.name = 'AuthCancelled';
  }
}


export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}


export function translate(error: unknown): never {
  if (error instanceof AuthCancelled) throw error;

  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/invalid-email':
      throw new AuthError(code, 'That email address is not valid.');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      throw new AuthError(code, 'Email or password is incorrect.');
    case 'auth/email-already-in-use':
      throw new AuthError(code, 'An account with that email already exists.');
    case 'auth/weak-password':
      throw new AuthError(code, 'Password must be at least 6 characters.');
    case 'auth/network-request-failed':
      throw new AuthError(code, 'Could not reach the server. Check your connection.');
    case 'auth/too-many-requests':
      throw new AuthError(code, 'Too many attempts. Try again shortly.');
    default:
      throw new AuthError(code === '' ? 'AUTH_FAILED' : code, 'Sign-in failed. Please try again.');
  }
}


export interface AuthUser {
  readonly uid: string;

  readonly emailVerified: boolean;
}


export type AuthDoorway = 'full' | 'cosmetic' | 'none';

export interface AuthCapabilities {
  readonly google: AuthDoorway;
}

export type { AuthRepository };
