const MAX_INITIALS = 2;


export function initialsFor(displayName: string | null, email: string | null): string {
  const fromName = initialsOfWords(displayName ?? '');
  if (fromName !== '') return fromName;

  const localPart = (email ?? '').split('@')[0] ?? '';
  const fromEmail = initialsOfWords(localPart);
  if (fromEmail !== '') return fromEmail;

  return '?';
}


function initialsOfWords(raw: string): string {
  return raw
    .split(/[\s._+-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
    .map((word) => [...word][0] ?? '')
    .filter((letter) => /[a-z0-9]/i.test(letter))
    .slice(0, MAX_INITIALS)
    .join('')
    .toUpperCase();
}
