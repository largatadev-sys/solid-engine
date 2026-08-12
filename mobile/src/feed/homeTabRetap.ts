export type HomeRetapListener = () => void;

let listener: HomeRetapListener | null = null;


export function onHomeTabRetap(listen: HomeRetapListener): () => void {
  listener = listen;
  return () => {
    if (listener === listen) {
      listener = null;
    }
  };
}


export function homeTabRetapped(): void {
  listener?.();
}
