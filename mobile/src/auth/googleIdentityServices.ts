


interface GoogleIdentityGlobal {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select: boolean;
        cancel_on_tap_outside: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: string; size: string; text: string; shape: string; width?: number },
      ) => void;
    };
  };
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';


type CredentialListener = (idToken: string) => void;

let clientId: string | null = null;
let loading: Promise<GoogleIdentityGlobal> | null = null;

let listener: CredentialListener | null = null;


export function configure(webClientId: string): void {
  clientId = webClientId;
}

function google(): GoogleIdentityGlobal | undefined {
  return (globalThis as unknown as { google?: GoogleIdentityGlobal }).google;
}


export function load(): Promise<GoogleIdentityGlobal> {
  if (loading !== null) return loading;

  loading = new Promise<GoogleIdentityGlobal>((resolve, reject) => {
    if (clientId === null || clientId === '') {
      reject(
        new Error(
          'Google sign-in has no client id. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — see mobile/.env.example.',
        ),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const gis = google();
      if (gis === undefined) {
        reject(new Error('Google sign-in failed to load. Check your connection and try again.'));
        return;
      }

      gis.accounts.id.initialize({
        client_id: clientId as string,
        callback: (response) => listener?.(response.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      resolve(gis);
    };

    script.onerror = () => {
      loading = null;
      reject(new Error('Google sign-in failed to load. Check your connection and try again.'));
    };

    document.head.appendChild(script);
  });

  return loading;
}


export async function renderButton(
  host: HTMLElement,
  onCredential: CredentialListener,
  width?: number,
): Promise<void> {
  const gis = await load();
  listener = onCredential;

  gis.accounts.id.renderButton(host, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    ...(width === undefined ? {} : { width: Math.min(width, 400) }),
  });
}


export function resetForTests(): void {
  clientId = null;
  loading = null;
  listener = null;
}
