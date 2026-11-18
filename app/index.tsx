import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuroraBackground } from '../components/AuroraBackground';
import { LetterCard } from '../components/LetterCard';
import { PullToRefresh, StampRefreshButton } from '../components/StampRefresh';
import { TabBar, useTabPad } from '../components/TabBar';
import { EmptyState, GlassCard, IconButton, PrimaryButton } from '../components/ui';
import { formatDate } from '../lib/explain';
import { useApp } from '../lib/store';
import { palette, radii, spacing, type, useResponsive } from '../lib/theme';

/**
 * Letters (Home) — the paper trail. Typographic hero ("Every letter, in
 * plain words.") + a data strip + the paste-a-letter composer up top,
 * then the timeline of document cards. On ≥840dp the screen splits:
 * letters on the left, the selected letter's explanation on the right.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { letters, lettersExplained, deadlinesThisWeek, stepsDone, user, guest } = useApp();
  const r = useResponsive();
  const tabPad = useTabPad();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The inbox is local; refresh re-reads state and replays the stamp.
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const selected = letters.find((l) => l.id === selectedId) ?? letters[0] ?? null;

  const hero = (
    <>
      <Animated.View entering={FadeInDown.springify()}>
        <Text style={styles.kicker}>CIVICHELPER</Text>
        <Text style={[styles.hero, r.display]}>Every letter, in plain words.</Text>
        <Text style={styles.heroBody}>
          Paste any official letter and get it explained — what it says, what
          it means for you, and what to do before when.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{lettersExplained}</Text>
            <Text style={styles.statLabel}>letters explained</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{deadlinesThisWeek}</Text>
            <Text style={styles.statLabel}>due this week</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stepsDone}</Text>
            <Text style={styles.statLabel}>steps done</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()}>
        <GlassCard style={styles.composer}>
          <View style={styles.composerRow}>
            <View style={styles.composerSeal}>
              <Text style={styles.composerSealText}>✉</Text>
            </View>
            <View style={styles.composerText}>
              <Text style={styles.composerTitle}>Got a confusing letter?</Text>
              <Text style={styles.composerBody}>Paste the text — CivicHelper explains it in plain words.</Text>
            </View>
          </View>
          <PrimaryButton label="Paste a letter" onPress={() => router.push('/explain')} />
        </GlassCard>
      </Animated.View>
    </>
  );

  const list = (
    <View style={styles.list}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your letters</Text>
        {Platform.OS === 'web' ? (
          <Pressable onPress={onRefresh} hitSlop={8}>
            <View style={styles.webRefresh}>
              <StampRefreshButton refreshing={refreshing} />
            </View>
          </Pressable>
        ) : null}
      </View>
      {letters.length === 0 ? (
        <EmptyState
          glyph="✉"
          title="No letters yet"
          body="Paste your first official letter and CivicHelper will explain it in plain words — with the steps and dates that matter."
          actionLabel="Paste a letter"
          onAction={() => router.push('/explain')}
        />
      ) : (
        letters.map((letter, i) => (
          <View key={letter.id}>
            {r.twoPane ? (
              <Pressable onPress={() => setSelectedId(letter.id)}>
                <LetterCard letter={letter} index={i} selected={selected?.id === letter.id} />
              </Pressable>
            ) : (
              <LetterCard letter={letter} index={i} />
            )}
          </View>
        ))
      )}
    </View>
  );

  if (r.twoPane) {
    return (
      <View style={styles.root}>
        <AuroraBackground />
        <View style={[styles.twoPane, { paddingLeft: tabPad.paddingLeft }]}>
          <ScrollView
            style={styles.paneList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.paneScrollContent}
          >
            {hero}
            {list}
          </ScrollView>
          <View style={styles.paneDetail}>
            {selected ? (
              <GlassCard style={styles.detailCard}>
                <Text style={styles.detailKicker}>{selected.sender.toUpperCase()}</Text>
                <Text style={styles.detailTitle}>{selected.title}</Text>
                {selected.explanation ? (
                  <>
                    <Text style={styles.detailSummary}>{selected.explanation.summary}</Text>
                    <Text style={styles.detailSteps}>
                      {selected.explanation.steps.length} step
                      {selected.explanation.steps.length === 1 ? '' : 's'}
                      {selected.dueDate ? ` · first due ${formatDate(selected.dueDate)}` : ''}
                    </Text>
                  </>
                ) : null}
                <PrimaryButton
                  label="Open the full explanation"
                  onPress={() => router.push(`/letter/${selected.id}` as never)}
                />
              </GlassCard>
            ) : (
              <EmptyState glyph="✉" title="Nothing selected" body="Pick a letter on the left to see its explanation here." />
            )}
          </View>
        </View>
        <TabBar active="letters" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <View style={[styles.scroll, { paddingBottom: tabPad.paddingBottom }]}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.greetingText}>
                {user?.name ? `Hello, ${user.name.split(' ')[0]}` : guest ? 'Hello, guest' : 'Hello'}
              </Text>
            </View>
            <IconButton label="⚙" onPress={() => router.push('/settings')} />
          </View>
          {hero}
          {list}
        </View>
      </PullToRefresh>
      <TabBar active="letters" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 56 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  greetingText: { ...type.subtitle, color: palette.ink },
  kicker: { ...type.label, color: palette.primary, marginBottom: 8 },
  hero: { color: palette.ink, marginBottom: 10 },
  heroBody: { ...type.body, color: palette.body, marginBottom: spacing.lg, maxWidth: 560 },
  stats: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: radii.card,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: 18,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNum: { color: '#FFFFFF', fontFamily: 'Archivo_800ExtraBold', fontSize: 30, lineHeight: 34 },
  statLabel: { color: 'rgba(250, 246, 238, 0.65)', fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  statDivider: { backgroundColor: 'rgba(255,255,255,0.18)', height: 36, width: 1 },
  composer: { gap: 14, marginBottom: spacing.xl, padding: spacing.md },
  composerRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  composerSeal: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  composerSealText: { color: palette.primary, fontSize: 24 },
  composerText: { flex: 1 },
  composerTitle: { ...type.subtitle, color: palette.ink },
  composerBody: { ...type.body, color: palette.body, marginTop: 2 },
  list: { gap: 0 },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  listTitle: { ...type.title, color: palette.ink },
  webRefresh: { height: 56, width: 56 },
  twoPane: { flex: 1, flexDirection: 'row', gap: 24, padding: 28 },
  paneList: { flex: 1.1 },
  paneScrollContent: { paddingBottom: 32 },
  paneDetail: { flex: 1, paddingTop: 120 },
  detailCard: { gap: 12, padding: spacing.lg },
  detailKicker: { ...type.label, color: palette.accent },
  detailTitle: { ...type.title, color: palette.ink },
  detailSummary: { ...type.body, color: palette.body },
  detailSteps: { ...type.bodyStrong, color: palette.primary },
});
