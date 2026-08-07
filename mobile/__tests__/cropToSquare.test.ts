import { cropToSquare } from '../src/media/cropToSquare.web';

// The cropper hands back a pixel region; this asserts the canvas is sized to that region and the
// source is drawn at the right offset. Web has no native crop dialog, so if this is wrong the
// traveler's framing is silently discarded and the server's centre-square is what they get.
describe('cropToSquare', () => {
  const drawImage = jest.fn();
  const toBlob = jest.fn((cb: (b: Blob | null) => void) => cb(new Blob(['jpeg'])));
  let canvas: { width: number; height: number; getContext: jest.Mock; toBlob: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    canvas = { width: 0, height: 0, getContext: jest.fn(() => ({ drawImage })), toBlob };
    (globalThis as { document?: unknown }).document = {
      createElement: (tag: string) => (tag === 'canvas' ? canvas : {}),
    };
    class FakeImage {
      addEventListener(event: string, run: () => void) {
        if (event === 'load') setTimeout(run, 0);
      }
      set src(_value: string) {}
    }
    (globalThis as { Image?: unknown }).Image = FakeImage;
  });

  it('sizes the canvas to the chosen region, so the result is exactly what was framed', async () => {
    await cropToSquare('blob:x', { x: 120, y: 40, width: 300, height: 300 }, 'photo.jpg');

    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(300);
  });

  it('draws from the chosen offset rather than the top-left of the source', async () => {
    await cropToSquare('blob:x', { x: 120, y: 40, width: 300, height: 300 }, 'photo.jpg');

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(), 120, 40, 300, 300, 0, 0, 300, 300,
    );
  });

  it('returns the encoded bytes for upload', async () => {
    const blob = await cropToSquare('blob:x', { x: 0, y: 0, width: 200, height: 200 }, 'photo.jpg');

    expect(blob).toBeInstanceOf(Blob);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92);
  });
});
