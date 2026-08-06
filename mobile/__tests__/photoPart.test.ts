import { photoPart } from '../src/media/photoPart.web';
import { photoPart as nativePhotoPart } from '../src/media/photoPart.native';

describe('photoPart on the web', () => {
  it('uploads the picked File itself, never a re-read of its object URL', async () => {
    const file = new File(['pixels'], 'holiday.jpg', { type: 'image/jpeg' });

    const part = await photoPart({
      uri: 'blob:http://localhost/abc',
      name: 'holiday.jpg',
      mimeType: 'image/jpeg',
      bytes: file,
    });

    const sent = part.get('photo');
    expect(sent).toBeInstanceOf(Blob);
    expect(await (sent as Blob).text()).toBe('pixels');
  });

  it('refuses a photo that carries no bytes rather than uploading nothing', async () => {
    await expect(
      photoPart({ uri: 'blob:http://localhost/abc', name: 'x.jpg', mimeType: 'image/jpeg' }),
    ).rejects.toThrow(/no bytes/);
  });
});

describe('photoPart on native', () => {
  it('sends the uri/name/type shape React Native requires for a file part', async () => {
    const appended: unknown[] = [];
    const capture = { append: (_name: string, value: unknown) => appended.push(value) };
    const original = globalThis.FormData;
    globalThis.FormData = function FakeFormData() {
      return capture;
    } as unknown as typeof FormData;

    try {
      await nativePhotoPart({
        uri: 'file:///storage/holiday.jpg',
        name: 'holiday.jpg',
        mimeType: 'image/jpeg',
      });
    } finally {
      globalThis.FormData = original;
    }

    expect(appended[0]).toEqual({
      uri: 'file:///storage/holiday.jpg',
      name: 'holiday.jpg',
      type: 'image/jpeg',
    });
  });
});
