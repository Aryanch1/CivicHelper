import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuroraBackground } from '../../components/AuroraBackground';
import {
  DemoBadge,
  EmptyState,
  GhostButton,
  GlassCard,
  IconButton,
  LiveBadge,
  MemberAvatar,
  PrimaryButton,
  SectionHeader,
} from '../../components/ui';
import { dueLabel, formatDate } from '../../lib/explain';
import { useApp } from '../../lib/store';
import { palette, radii, spacing, type, useResponsive } from '../../lib/theme';

/**
 * Letter detail — the stamped explanation. Summary, what it means for
 * you, numbered action steps with deadlines and done toggles, key dates,
 * source badge, and the not-legal-advice disclaimer on every view.
 */
export default function LetterDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { letterById, toggleStep, markLetterDone, deleteLetter } = useApp();
  const r = useResponsive();
  const [doneNotice, setDoneNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const letter = letterById(id ?? '');
  if (!letter) {
    return (
      <View style={styles.root}>
        <AuroraBackground />
        <View style={styles.centered}>
          <EmptyState
            glyph="✉"
            title="Letter not found"
            body="This letter may have been deleted. Go back to your letters."
            actionLabel="Back to letters"
            onAction={() => router.replace('/')}
          />
        </View>
      </View>
    );
  }

  const explanation = letter.explanation;
  const stepsDone = explanation?.steps.filter((s) => s.done).length ?? 0;
  const stepsTotal = explanation?.steps.length ?? 0;

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <View style={styles.header}>
          <IconButton label="←" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Letter</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <GlassCard style={styles.docCard}>
            <View style={styles.perforation} />
            <View style={styles.docRow}>
              <MemberAvatar member={{ name: letter.sender }} index={1} size={56} />
              <View style={styles.docMain}>
                <Text style={styles.sender}>{letter.sender}</Text>
                <Text style={styles.title}>{letter.title}</Text>
                <Text style={styles.received}>
                  Received {new Date(letter.receivedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              {explanation?.source === 'live' ? <LiveBadge /> : <DemoBadge />}
            </View>
            {letter.dueDate && !letter.done ? (
              <View style={styles.dueRow}>
                <Text style={styles.dueText}>{dueLabel(letter.dueDate)} — {formatDate(letter.dueDate)}</Text>
              </View>
            ) : null}
          </GlassCard>
        </Animated.View>

        {explanation ? (
          <>
            <View style={styles.stampMark}>
              <Text style={styles.stampMarkText}>EXPLAINED</Text>
            </View>

            <SectionHeader kicker="In plain words" title="What it says" />
            <GlassCard style={styles.card}>
              <Text style={styles.body}>{explanation.summary}</Text>
            </GlassCard>

            <SectionHeader kicker="For you" title="What this means for you" />
            <GlassCard style={styles.card}>
              <Text style={styles.body}>{explanation.meaning}</Text>
            </GlassCard>

            <SectionHeader
              kicker="Action steps"
              title={`What to do (${stepsDone} of ${stepsTotal} done)`}
            />
            <GlassCard style={styles.card}>
              {explanation.steps.map((step, i) => (
                <Pressable key={step.id} onPress={() => toggleStep(letter.id, step.id)} hitSlop={6}>
                  <View style={[styles.stepRow, i < explanation.steps.length - 1 && styles.stepDivider]}>
                    <View style={[styles.stepNum, step.done && styles.stepNumDone]}>
                      <Text style={[styles.stepNumText, step.done && styles.stepNumTextDone]}>
                        {step.done ? '✓' : i + 1}
                      </Text>
                    </View>
                    <View style={styles.stepMain}>
                      <Text style={[styles.stepText, step.done && styles.stepTextDone]}>{step.text}</Text>
                      {step.deadline ? (
                        <Text style={styles.stepDeadline}>{dueLabel(step.deadline)} · {formatDate(step.deadline)}</Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              ))}
            </GlassCard>

            {explanation.keyDates.length > 0 ? (
              <>
                <SectionHeader kicker="Key dates" title="Dates to remember" />
                <GlassCard style={styles.card}>
                  {explanation.keyDates.map((kd, i) => (
                    <View key={`${kd.date}-${i}`} style={[styles.dateRow, i < explanation.keyDates.length - 1 && styles.stepDivider]}>
                      <View style={styles.dateDay}>
                        <Text style={styles.dateDayNum}>{kd.date.slice(8, 10)}</Text>
                        <Text style={styles.dateDayMon}>{formatDate(kd.date).split(' ')[1]}</Text>
                      </View>
                      <View style={styles.stepMain}>
                        <Text style={styles.stepText}>{kd.label}</Text>
                        <Text style={styles.stepDeadline}>{formatDate(kd.date)}</Text>
                      </View>
                    </View>
                  ))}
                </GlassCard>
              </>
            ) : null}

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerTitle}>Not legal advice</Text>
              <Text style={styles.disclaimerBody}>
                This is a plain-language explanation, not legal advice. For
                anything binding, check with the office that sent the letter.
                {explanation.source === 'demo'
                  ? ' This explanation was made on your device in demo mode — the live AI service is not connected yet.'
                  : ''}
              </Text>
            </View>

            {letter.done ? (
              <Text style={styles.doneBanner}>✓ All done — every step is complete.</Text>
            ) : (
              <PrimaryButton
                label="Mark this letter done"
                sub={`${stepsTotal - stepsDone} step${stepsTotal - stepsDone === 1 ? '' : 's'} left`}
                onPress={() => {
                  markLetterDone(letter.id);
                  setDoneNotice('Marked done — nice work, that letter is handled.');
                }}
              />
            )}
            {doneNotice ? <Text style={styles.notice}>{doneNotice}</Text> : null}

            <View style={styles.dangerZone}>
              {confirmDelete ? (
                <GhostButton
                  label="Tap again to delete this letter"
                  onPress={() => {
                    deleteLetter(letter.id);
                    router.replace('/');
                  }}
                />
              ) : (
                <GhostButton label="Delete this letter" onPress={() => setConfirmDelete(true)} />
              )}
            </View>
          </>
        ) : (
          <EmptyState
            glyph="✉"
            title="No explanation yet"
            body="This letter has no explanation saved. Paste it again from the Explain screen."
            actionLabel="Explain a letter"
            onAction={() => router.push('/explain')}
          />
        )}

        <View style={styles.original}>
          <Text style={styles.originalTitle}>Original letter text</Text>
          <Text style={styles.originalBody}>{letter.originalText}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  headerTitle: { ...type.title, color: palette.ink, flex: 1 },
  headerSpacer: { width: 44 },
  docCard: { gap: 12, marginBottom: spacing.md, padding: spacing.md },
  perforation: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  docRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  docMain: { flex: 1, minWidth: 0 },
  sender: { ...type.caption, color: palette.accent, letterSpacing: 0.6 },
  title: { ...type.subtitle, color: palette.ink, marginTop: 2 },
  received: { ...type.caption, color: palette.muted, marginTop: 2 },
  dueRow: { backgroundColor: palette.primarySoft, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8 },
  dueText: { color: palette.primary, fontSize: 14, fontWeight: '800' },
  stampMark: {
    alignSelf: 'flex-start',
    borderColor: palette.primary,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '-4deg' }],
  },
  stampMarkText: { color: palette.primary, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  card: { gap: 10, marginBottom: spacing.xl, padding: spacing.md },
  body: { ...type.body, color: palette.body },
  stepRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, paddingVertical: 10 },
  stepDivider: { borderBottomColor: palette.line, borderBottomWidth: 1 },
  stepNum: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepNumDone: { backgroundColor: palette.successSoft },
  stepNumText: { color: palette.primary, fontSize: 16, fontWeight: '800' },
  stepNumTextDone: { color: palette.success },
  stepMain: { flex: 1 },
  stepText: { ...type.body, color: palette.ink },
  stepTextDone: { color: palette.muted, textDecorationLine: 'line-through' },
  stepDeadline: { ...type.caption, color: palette.primary, marginTop: 2 },
  dateRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 8 },
  dateDay: { alignItems: 'center', width: 44 },
  dateDayNum: { color: palette.primary, fontFamily: 'Archivo_800ExtraBold', fontSize: 24, lineHeight: 26 },
  dateDayMon: { color: palette.muted, fontSize: 11, fontWeight: '800' },
  disclaimer: {
    backgroundColor: palette.warningSoft,
    borderRadius: radii.card,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  disclaimerTitle: { ...type.subtitle, color: palette.warning, marginBottom: 4 },
  disclaimerBody: { ...type.body, color: palette.body },
  doneBanner: { ...type.bodyStrong, color: palette.success, marginBottom: spacing.md, textAlign: 'center' },
  notice: { ...type.bodyStrong, color: palette.success, marginTop: spacing.md, textAlign: 'center' },
  dangerZone: { marginTop: spacing.lg },
  original: { marginTop: spacing.xl },
  originalTitle: { ...type.subtitle, color: palette.ink, marginBottom: spacing.sm },
  originalBody: { ...type.body, color: palette.muted },
});
