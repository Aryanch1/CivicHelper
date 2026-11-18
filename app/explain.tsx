import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuroraBackground } from '../components/AuroraBackground';
import { Chip, GlassCard, IconButton, PrimaryButton, SectionHeader } from '../components/ui';
import { SAMPLE_LETTERS } from '../lib/explain';
import { useApp } from '../lib/store';
import { CATEGORY_LABELS, type LetterCategory } from '../lib/types';
import { palette, radii, spacing, type, useResponsive } from '../lib/theme';

const CATEGORIES: LetterCategory[] = ['council', 'utility', 'benefits', 'bank', 'health', 'other'];

/**
 * Explain — paste or type a letter, pick a sample, get it explained.
 * On success the letter is saved and the detail screen opens, so the
 * result is visible where the user is looking.
 */
export default function ExplainScreen() {
  const router = useRouter();
  const { addLetter } = useApp();
  const r = useResponsive();
  const [text, setText] = useState('');
  const [sender, setSender] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LetterCategory>('other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSample = (id: string) => {
    const sample = SAMPLE_LETTERS.find((s) => s.id === id);
    if (!sample) return;
    setText(sample.text);
    setSender(sample.sender);
    setTitle(sample.title);
    setCategory(sample.category);
    setError(null);
  };

  const submit = async () => {
    if (text.trim().length < 20) {
      setError('Paste a bit more of the letter first — a sentence or two at least.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const letter = await addLetter({ text: text.trim(), sender, title, category });
      router.replace(`/letter/${letter.id}` as never);
    } catch {
      setError('Could not explain that letter. Check the text and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <View style={styles.header}>
          <IconButton label="←" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Explain a letter</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.kicker}>PASTE IT IN</Text>
          <Text style={[styles.hero, r.display]}>What does it actually say?</Text>
          <Text style={styles.heroBody}>
            Copy the letter text in below. CivicHelper reads it and explains it
            in plain words, with the steps and the dates that matter.
          </Text>
        </Animated.View>

        <SectionHeader kicker="Try one" title="Or start from a sample" />
        <View style={styles.samples}>
          {SAMPLE_LETTERS.map((sample) => (
            <Chip
              key={sample.id}
              label={sample.title}
              selected={title === sample.title && text === sample.text}
              onPress={() => loadSample(sample.id)}
            />
          ))}
        </View>

        <SectionHeader kicker="Your letter" title="Paste the text" />
        <GlassCard style={styles.card}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={text}
            onChangeText={setText}
            placeholder="Paste the letter text here…"
            placeholderTextColor={palette.muted}
            multiline
            textAlignVertical="top"
          />
          <TextInput
            style={styles.input}
            value={sender}
            onChangeText={setSender}
            placeholder="Who sent it? (e.g. Riverton Borough Council)"
            placeholderTextColor={palette.muted}
          />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What is it about? (e.g. Council Tax Bill)"
            placeholderTextColor={palette.muted}
          />
          <Text style={styles.categoryLabel}>What kind of letter is it?</Text>
          <View style={styles.categories}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={CATEGORY_LABELS[c]}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
          <PrimaryButton label="Explain this letter" onPress={() => void submit()} loading={busy} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </GlassCard>

        <Text style={styles.disclaimer}>
          Your letter text stays on your device, or in your account when
          signed in. It is never shared with anyone else.
        </Text>
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
  kicker: { ...type.label, color: palette.primary, marginBottom: 8 },
  hero: { color: palette.ink, marginBottom: 10 },
  heroBody: { ...type.body, color: palette.body, marginBottom: spacing.lg, maxWidth: 560 },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.xl },
  card: { gap: 12, marginBottom: spacing.lg, padding: spacing.md },
  input: {
    backgroundColor: palette.primaryPale,
    borderRadius: radii.input,
    color: palette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  textArea: { minHeight: 220 },
  categoryLabel: { ...type.bodyStrong, color: palette.ink, marginTop: 4 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  error: { ...type.bodyStrong, color: palette.error, textAlign: 'center' },
  disclaimer: { ...type.caption, color: palette.muted, textAlign: 'center' },
});
