import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuroraBackground } from '../components/AuroraBackground';
import { TabBar, useTabPad } from '../components/TabBar';
import { EmptyState, GlassCard, SectionHeader } from '../components/ui';
import { dueLabel, formatDate } from '../lib/explain';
import { useApp } from '../lib/store';
import { palette, spacing, type, useResponsive } from '../lib/theme';

/**
 * Deadlines — every undone action step with a date, soonest first.
 * Big day numerals, letter + step, done toggle per step.
 */
export default function DeadlinesScreen() {
  const router = useRouter();
  const { deadlines, toggleStep } = useApp();
  const r = useResponsive();
  const tabPad = useTabPad();

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { maxWidth: r.contentMaxWidth, alignSelf: 'center', paddingBottom: tabPad.paddingBottom, paddingLeft: tabPad.paddingLeft },
        ]}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.kicker}>DEADLINES</Text>
          <Text style={[styles.hero, r.display]}>What is due, and when.</Text>
          <Text style={styles.heroBody}>
            Every action step from your letters that still needs doing,
            soonest first. Tap a step when it is done.
          </Text>
        </Animated.View>

        {deadlines.length === 0 ? (
          <EmptyState
            glyph="◷"
            title="Nothing due"
            body="No action steps with dates are waiting. Explain a letter and its deadlines will show up here."
            actionLabel="Explain a letter"
            onAction={() => router.push('/explain')}
          />
        ) : (
          <>
            <SectionHeader kicker="Upcoming" title={`${deadlines.length} step${deadlines.length === 1 ? '' : 's'} to do`} />
            <GlassCard style={styles.card}>
              {deadlines.map((item, i) => (
                <Pressable
                  key={`${item.letterId}-${item.stepId}`}
                  onPress={() => toggleStep(item.letterId, item.stepId)}
                  hitSlop={6}
                >
                  <View style={[styles.row, i < deadlines.length - 1 && styles.divider]}>
                    <View style={styles.day}>
                      <Text style={styles.dayNum}>{item.deadline.slice(8, 10)}</Text>
                      <Text style={styles.dayMon}>{formatDate(item.deadline).split(' ')[1]}</Text>
                    </View>
                    <View style={styles.main}>
                      <Text style={styles.stepText}>{item.text}</Text>
                      <Text style={styles.letterText}>
                        {item.letterTitle} · {item.sender}
                      </Text>
                      <Text style={styles.dueText}>{dueLabel(item.deadline)} · {formatDate(item.deadline)}</Text>
                    </View>
                    <View style={styles.check}>
                      <Text style={styles.checkText}>○</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </GlassCard>
            <Text style={styles.hint}>
              Tapping a step marks it done and removes it from this list.
            </Text>
          </>
        )}
      </ScrollView>
      <TabBar active="deadlines" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 56, width: '100%' },
  kicker: { ...type.label, color: palette.primary, marginBottom: 8 },
  hero: { color: palette.ink, marginBottom: 10 },
  heroBody: { ...type.body, color: palette.body, marginBottom: spacing.lg, maxWidth: 560 },
  card: { gap: 0, marginBottom: spacing.lg, padding: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 12 },
  divider: { borderBottomColor: palette.line, borderBottomWidth: 1 },
  day: { alignItems: 'center', width: 48 },
  dayNum: { color: palette.primary, fontFamily: 'Archivo_800ExtraBold', fontSize: 28, lineHeight: 30 },
  dayMon: { color: palette.muted, fontSize: 11, fontWeight: '800' },
  main: { flex: 1 },
  stepText: { ...type.body, color: palette.ink },
  letterText: { ...type.caption, color: palette.muted, marginTop: 2 },
  dueText: { ...type.caption, color: palette.primary, marginTop: 2 },
  check: {
    alignItems: 'center',
    borderColor: palette.line,
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  checkText: { color: palette.muted, fontSize: 18 },
  hint: { ...type.caption, color: palette.muted, textAlign: 'center' },
});
