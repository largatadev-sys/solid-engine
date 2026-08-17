import { API, request } from './pool';

export interface RawResponse {
  status: number;
  bytes: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

const SOLID_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a'
  + 'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIAAgBAREA/8QAHwAAAQUBAQEB'
  + 'AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1Fh'
  + 'ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ'
  + 'WmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG'
  + 'x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiv/9k=';

export const EXIF_MARKER = Buffer.from('Exif\0\0', 'binary');

export function solidJpeg(): Buffer {
  return Buffer.from(SOLID_JPEG_BASE64, 'base64');
}

export function jpegWithExif(sentinel: string): Buffer {
  const plain = solidJpeg();
  const payload = Buffer.concat([EXIF_MARKER, Buffer.from(sentinel, 'ascii')]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([
    plain.subarray(0, 2),
    Buffer.from([0xff, 0xe1]),
    length,
    payload,
    plain.subarray(2),
  ]);
}

export function wideJpeg(): Buffer {
  const width = 1200;
  const height = 900;
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const dqt = Buffer.concat([Buffer.from([0xff, 0xdb, 0x00, 0x43, 0x00]), Buffer.alloc(64, 0x10)]);
  const sof = Buffer.from([
    0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00,
  ]);
  const dht = Buffer.concat([
    Buffer.from([0xff, 0xc4, 0x00, 0x1f, 0x00]),
    Buffer.from([0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]),
    Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    Buffer.from([0xff, 0xc4, 0x00, 0xb5, 0x10]),
    Buffer.from([0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d]),
    Buffer.alloc(162, 0x01),
  ]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]);
  const scan = Buffer.alloc(24000, 0x5a);
  return Buffer.concat([header, dqt, sof, dht, sos, scan, Buffer.from([0xff, 0xd9])]);
}

export function jpegDimensions(buffer: Buffer): { width: number; height: number } {
  for (let index = 2; index < buffer.length - 9; ) {
    if (buffer[index] !== 0xff) {
      index += 1;
      continue;
    }
    const marker = buffer[index + 1]!;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(index + 5), width: buffer.readUInt16BE(index + 7) };
    }
    index += 2 + buffer.readUInt16BE(index + 2);
  }
  return { width: 0, height: 0 };
}

export function multipart(bytes: Buffer, filename: string, field = 'photo'): {
  boundary: string;
  body: Buffer;
} {
  const boundary = `----largatae2e${process.hrtime.bigint().toString(36)}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\n`
      + 'Content-Type: image/jpeg\r\n\r\n',
    'utf8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return { boundary, body: Buffer.concat([head, bytes, tail]) };
}

export async function uploadBytes(
  route: string,
  token: string,
  bytes: Buffer,
  filename = 'photo.jpg',
): Promise<{ status: number; body: any }> {
  const { boundary, body } = multipart(bytes, filename);
  return request(API + route, 'POST', body, {
    Authorization: `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

export async function postDiaryEntry(
  tripId: string,
  token: string,
  entry: unknown,
  photoCount: number,
): Promise<{ status: number; body: any }> {
  const boundary = `----largatadiary${process.hrtime.bigint().toString(36)}`;
  const parts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n\r\n`
        + `${JSON.stringify(entry)}\r\n`,
      'utf8',
    ),
  ];
  for (let index = 0; index < photoCount; index += 1) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="photos"; `
          + `filename="device-${index}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
        'utf8',
      ),
      solidJpeg(),
      Buffer.from('\r\n', 'utf8'),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

  return request(`${API}/v1/itineraries/${tripId}/diary/entries`, 'POST', Buffer.concat(parts), {
    Authorization: `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

export function fetchBytes(url: string, token?: string): Promise<RawResponse> {
  if (typeof url !== 'string' || !url.startsWith('/')) {
    return Promise.resolve({ status: 0, bytes: Buffer.alloc(0), headers: {} });
  }
  return new Promise((resolve) => {
    const target = new URL(API + url);
    const lib = target.protocol === 'https:' ? require('node:https') : require('node:http');
    const options = {
      method: 'GET',
      headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
    };
    const call = lib.request(target, options, (response: any) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () =>
        resolve({
          status: response.statusCode,
          bytes: Buffer.concat(chunks),
          headers: response.headers,
        }),
      );
    });
    call.on('error', () => resolve({ status: 0, bytes: Buffer.alloc(0), headers: {} }));
    call.end();
  });
}
