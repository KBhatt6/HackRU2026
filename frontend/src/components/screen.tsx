import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type Props = PropsWithChildren<
  ScrollViewProps & {
    scroll?: boolean;
  }
>;

export function Screen({ children, scroll = true, contentContainerStyle, ...props }: Props) {
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.staticContent}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 48, gap: spacing.lg },
  staticContent: { flex: 1, padding: spacing.md },
});
