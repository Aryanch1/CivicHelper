import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuroraBackground } from '../components/AuroraBackground';
import { GhostButton, GlassCard, IconButton, SectionHeader } from '../components/ui';
import { palette, spacing, type, useResponsive } from '../lib/theme';

/** Help & about — how explaining works, the disclaimer, privacy. */
export default function HelpScreen() {
  const router = useRouter();
  const r = useResponsive();

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <View style={styles.header}>
          <IconButton label="←" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Help</Text>
          <View style={styles.headerSpacer} />
        </View>

        <SectionHeader kicker="How it works" title="Plain words, in four steps" />
        <GlassCard style={styles.card}>
          <Text style={styles.step}>1 · Paste the letter</Text>
          <Text style={styles.body}>
            Copy the text of any official letter — council, utility, benefits,
            bank, health — into the Explain screen, or start from a sample.
          </Text>
          <Text style={styles.step}>2 · Get it explained</Text>
          <Text style={styles.body}>
            CivicHelper reads the letter and writes back a plain-language
            summary: what it says, what it means for you, and the dates that
            matter.
          </Text>
          <Text style={styles.step}>3 · Follow the steps</Text>
          <Text style={styles.body}>
            Each explanation comes with numbered action steps and deadlines.
            Tap a step when it is done; the Deadlines screen keeps everything
            due soonest first.
          </Text>
          <Text style={styles.step}>4 · Keep the letter</Text>
          <Text style={styles.body}>
            Explained letters stay in your inbox with the original text
            attached, so you can check the exact wording any time.
          </Text>
        </GlassCard>

        <SectionHeader kicker="Important" title="What CivicHelper is not" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            CivicHelper gives plain-language explanations, not legal advice.
            For anything binding — an appeal, a payment dispute, a deadline
            with legal consequences — check with the office that sent the
            letter, or a qualified adviser. If a date or amount in an
            explanation looks wrong, trust the original letter.
          </Text>
        </GlassCard>

        <SectionHeader kicker="Demo mode" title="Live AI vs on-device" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            When the live AI service is connected, explanations come from
            Gemini and carry a LIVE AI badge. Until then, the app explains
            letters on-device with a rule-based reader and marks them DEMO —
            it only uses dates, amounts and sentences that are actually in
            the letter, and never invents a fact.
          </Text>
        </GlassCard>

        <SectionHeader kicker="Your data" title="Privacy" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            Letters and history live on your device, and sync to your account
            when you sign in. Nothing is shared with anyone else. The three
            sample letters are demo data; clear them from Settings when you
            are ready.
          </Text>
        </GlassCard>

        <SectionHeader kicker="About" title="CivicHelper" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            CivicHelper turns confusing official letters into plain language,
            with clear action steps and deadlines — built by Aryanmouli
            Cherupalli. Designed in Figma; React Native + Expo + TypeScript,
            Gemini AI for explanations (Python serverless), Firebase for
            accounts and sync.
          </Text>
        </GlassCard>

        <GhostButton label="Back to your letters" onPress={() => router.replace('/')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  headerTitle: { ...type.title, color: palette.ink, flex: 1 },
  headerSpacer: { width: 44 },
  card: { gap: 10, marginBottom: spacing.xl, padding: spacing.md },
  step: { ...type.subtitle, color: palette.ink },
  body: { ...type.body, color: palette.body },
});
