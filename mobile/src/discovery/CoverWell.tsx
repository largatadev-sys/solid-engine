import { StyleSheet, View } from 'react-native';
import { coverTintFor } from './coverTint';


export function CoverWell({ subject }: { readonly subject: string }) {
  const tint = coverTintFor(subject);

  return (
    <View style={[styles.well, { backgroundColor: tint.base }]}>
      <View style={[styles.wash, { backgroundColor: tint.wash }]} />
    </View>
  );
}


const styles = StyleSheet.create({
  well: {
    ...StyleSheet.absoluteFill,
  },
  wash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    opacity: 0.55,
  },
});
