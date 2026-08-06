import { photoPart } from '../src/media/photoPart.web';
import { photoPart as nativePhotoPart } from '../src/media/photoPart.native';
import { File as ExpoFile } from 'expo-file-system';

jest.mock('expo-file-system', () => ({
  File: jest.fn(function FakeExpoFile(this: Record<string, unknown>, uri: string) {
    this.uri = uri;
  }),
}));

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

// React Native 0.86 rejects the old {uri, name, type} FormData idiom with "Unsupported
// FormDataPart implementation", and its Blob cannot be built from an ArrayBuffer — both proven
// on a device at S3.3. expo-file-system's File IS a Blob, which is the one shape that works.
describe('photoPart on native', () => {
  it('appends the picked file as a real Blob, not a uri-shaped object', async () => {
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

    expect(ExpoFile).toHaveBeenCalledWith('file:///storage/holiday.jpg');
    expect(appended).toHaveLength(1);
  });
});
