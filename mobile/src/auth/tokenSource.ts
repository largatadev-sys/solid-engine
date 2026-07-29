

export type TokenSource = () => Promise<string | null>;


const anonymous: TokenSource = async () => null;

let current: TokenSource = anonymous;


export function setTokenSource(source: TokenSource): void {
  current = source;
}

export async function currentToken(): Promise<string | null> {
  return current();
}


export function resetTokenSource(): void {
  current = anonymous;
}
