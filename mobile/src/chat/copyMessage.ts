import * as Clipboard from 'expo-clipboard';


export async function copyMessage(body: string): Promise<void> {
  await Clipboard.setStringAsync(body);
}
