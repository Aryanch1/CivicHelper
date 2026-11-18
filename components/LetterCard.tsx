import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MemberAvatar, SpringPress } from './ui';
import { dueLabel } from '../lib/explain';
import type { Letter } from '../lib/types';
import { palette, radii, spacing, type } from '../lib/theme';
import { useApp } from '../lib/store';

/**
 * A letter as a document card: sender seal, urgency ribbon, plain-language
 * verdict, due chip. The perforated top edge (dashed hairline) marks it
 * as a piece of mail, not a generic list row.
 */

function ribbonStyle(urgency: string) {
  if (urgency === 'urgent') return { bg: palette.urgentSoft, fg: palette.urgent, label: 'DUE SOON' };
  if (urgency === 'soon') return { bg: palette.soonSoft, fg: palette.soon, label: 'COMING UP' };
  return { bg: palette.noneSoft, fg: palette.none, label: 'NO DEADLINE' };
}

export function LetterCard({
  letter,
  index,
  selected,
}: {
  letter: Letter;
  index: number;
  selected?: boolean;
}) {
  const router = useRouter();
  const { urgencyOf } = useApp();
  const urgency = urgencyOf(letter);
  const ribbon = ribbonStyle(urgency);
  const verdict = letter.explanation?.summary ?? 'Tap to read this letter.';
  const done = letter.done;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <SpringPress
        onPress={() => router.push(`/letter/${letter.id}` as never)}
        style={selected ? styles.selected : undefined}
      >
        <View style={[styles.card, done && styles.cardDone]}>
          <View style={styles.perforation} />
          <View style={styles.row}>
            <MemberAvatar member={{ name: letter.sender }} index={index} size={52} />
            <View style={styles.main}>
              <Text style={styles.sender} numberOfLines={1}>
                {letter.sender}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {letter.title}
              </Text>
            </View>
            <View style={[styles.ribbon, { backgroundColor: ribbon.bg }]}>
              <Text style={[styles.ribbonText, { color: ribbon.fg }]}>{ribbon.label}</Text>
            </View>
          </View>
          <Text style={styles.verdict} numberOfLines={2}>
            {verdict}
          </Text>
          <View style={styles.footer}>
            {letter.dueDate && !done ? (
              <View style={styles.dueChip}>
                <Text style={styles.dueChipText}>{dueLabel(letter.dueDate)}</Text>
              </View>
            ) : done ? (
              <View style={[styles.dueChip, styles.doneChip]}>
                <Text style={[styles.dueChipText, styles.doneChipText]}>✓ Done</Text>
              </View>
            ) : (
              <View style={styles.dueChip}>
                <Text style={styles.dueChipText}>Explained</Text>
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </SpringPress>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  selected: { opacity: 1 },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderRadius: radii.card,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardDone: { opacity: 0.75 },
  perforation: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  main: { flex: 1, minWidth: 0 },
  sender: { ...type.caption, color: palette.accent, letterSpacing: 0.6 },
  title: { ...type.subtitle, color: palette.ink, marginTop: 2 },
  ribbon: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  ribbonText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  verdict: { ...type.body, color: palette.body, marginTop: spacing.md },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  dueChip: {
    backgroundColor: palette.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dueChipText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  doneChip: { backgroundColor: palette.successSoft },
  doneChipText: { color: palette.success },
  chevron: { color: palette.muted, fontSize: 22, fontWeight: '700' },
});
