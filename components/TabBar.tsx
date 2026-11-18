import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { SpringPress } from './ui';
import { palette, radii, spacing, useResponsive } from '../lib/theme';

/**
 * CivicHelper navigation — a dark ink bar, NOT a floating glass pill
 * (FridgeToMeal/MediGuide), NOT top segmented tabs (SplitEase), NOT a
 * flat light bar (PlantDoctor). Cream labels, a stamp-red pill on the
 * active tab, and a raised circular red "+" in the centre that opens
 * Explain. On wide screens (≥840dp) it becomes a left master-detail
 * rail: a vertical ink rail on the far left.
 */

export type TabKey = 'letters' | 'deadlines' | 'settings';

const TABS: { key: TabKey; label: string; glyph: string; route: string }[] = [
  { key: 'letters', label: 'Letters', glyph: '✉', route: '/' },
  { key: 'deadlines', label: 'Deadlines', glyph: '◷', route: '/deadlines' },
  { key: 'settings', label: 'Settings', glyph: '⚙', route: '/settings' },
];

export function TabBar({ active }: { active: TabKey }) {
  const router = useRouter();
  const r = useResponsive();

  if (r.twoPane) {
    return (
      <View style={styles.rail}>
        <View style={styles.railSeal}>
          <Text style={styles.railSealText}>C</Text>
        </View>
        {TABS.map((tab) => (
          <SpringPress key={tab.key} onPress={() => router.replace(tab.route as never)}>
            <View style={[styles.railItem, active === tab.key && styles.railItemActive]}>
              <Text style={[styles.railGlyph, active === tab.key && styles.railGlyphActive]}>
                {tab.glyph}
              </Text>
              <Text style={[styles.railLabel, active === tab.key && styles.railLabelActive]}>
                {tab.label}
              </Text>
            </View>
          </SpringPress>
        ))}
        <View style={styles.railSpacer} />
        <SpringPress onPress={() => router.push('/explain')} haptic>
          <View style={styles.railPlus}>
            <Text style={styles.railPlusText}>+</Text>
          </View>
        </SpringPress>
      </View>
    );
  }

  return (
    <View style={styles.barWrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <SpringPress onPress={() => router.replace('/' as never)}>
          <View style={[styles.tab, active === 'letters' && styles.tabActive]}>
            <Text style={[styles.tabGlyph, active === 'letters' && styles.tabGlyphActive]}>✉</Text>
            <Text style={[styles.tabLabel, active === 'letters' && styles.tabLabelActive]}>Letters</Text>
          </View>
        </SpringPress>
        <SpringPress onPress={() => router.push('/explain')} haptic>
          <View style={styles.plus}>
            <Text style={styles.plusText}>+</Text>
          </View>
        </SpringPress>
        <SpringPress onPress={() => router.replace('/deadlines' as never)}>
          <View style={[styles.tab, active === 'deadlines' && styles.tabActive]}>
            <Text style={[styles.tabGlyph, active === 'deadlines' && styles.tabGlyphActive]}>◷</Text>
            <Text style={[styles.tabLabel, active === 'deadlines' && styles.tabLabelActive]}>Deadlines</Text>
          </View>
        </SpringPress>
        <SpringPress onPress={() => router.replace('/settings' as never)}>
          <View style={[styles.tab, active === 'settings' && styles.tabActive]}>
            <Text style={[styles.tabGlyph, active === 'settings' && styles.tabGlyphActive]}>⚙</Text>
            <Text style={[styles.tabLabel, active === 'settings' && styles.tabLabelActive]}>Settings</Text>
          </View>
        </SpringPress>
      </View>
    </View>
  );
}

/** Content padding that keeps the page clear of the tab bar / rail. */
export function useTabPad(): { paddingBottom: number; paddingLeft: number } {
  const r = useResponsive();
  if (r.twoPane) return { paddingBottom: 32, paddingLeft: 104 };
  return { paddingBottom: 116, paddingLeft: 0 };
}

const styles = StyleSheet.create({
  barWrap: {
    bottom: Platform.OS === 'web' ? 16 : 24,
    left: 0,
    position: 'absolute',
    right: 0,
    alignItems: 'center',
  },
  bar: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: radii.card,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minHeight: 52,
    minWidth: 72,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  tabActive: { backgroundColor: palette.primary },
  tabGlyph: { color: 'rgba(250, 246, 238, 0.65)', fontSize: 19, fontWeight: '700' },
  tabGlyphActive: { color: '#FFFFFF' },
  tabLabel: { color: 'rgba(250, 246, 238, 0.65)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  tabLabelActive: { color: '#FFFFFF' },
  plus: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: -30,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    width: 56,
  },
  plusText: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', lineHeight: 32 },
  rail: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    bottom: 0,
    gap: 10,
    left: 0,
    paddingTop: 28,
    paddingBottom: 28,
    position: 'absolute',
    top: 0,
    width: 88,
  },
  railSeal: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
    width: 48,
  },
  railSealText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  railItem: {
    alignItems: 'center',
    borderRadius: 18,
    minHeight: 64,
    justifyContent: 'center',
    width: 68,
  },
  railItemActive: { backgroundColor: palette.primary },
  railGlyph: { color: 'rgba(250, 246, 238, 0.65)', fontSize: 20, fontWeight: '700' },
  railGlyphActive: { color: '#FFFFFF' },
  railLabel: { color: 'rgba(250, 246, 238, 0.65)', fontSize: 10, fontWeight: '700', marginTop: 3 },
  railLabelActive: { color: '#FFFFFF' },
  railSpacer: { flex: 1 },
  railPlus: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  railPlusText: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', lineHeight: 32 },
});
