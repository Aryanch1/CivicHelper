import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette } from '../lib/theme';

/**
 * CivicHelper's custom pull-to-refresh: a rubber stamp.
 *
 * The pull is scrubbed by finger distance — a circular red stamp drops
 * down onto the page as the user pulls; past the threshold, releasing
 * presses the stamp (a thump loop) and the "EXPLAINED" mark stamps in
 * while data returns, then the content settles with a spring. Never the
 * stock spinner. On web, where native pull-to-refresh doesn't exist,
 * the same animation is wired to the header refresh button (see the
 * `StampRefreshButton` export).
 */

const THRESHOLD = 90;

function StampVisual({
  fill,
  refreshing,
}: {
  /** 0–1 fill level while pulling; ignored while `refreshing` loops. */
  fill: SharedValue<number>;
  refreshing: boolean;
}) {
  const thump = useSharedValue(1);
  useEffect(() => {
    if (refreshing) {
      thump.value = withRepeat(
        withSequence(
          withTiming(0.88, { duration: 220 }),
          withTiming(1, { duration: 320 }),
        ),
        -1,
        false,
      );
    } else {
      thump.value = withTiming(1, { duration: 200 });
    }
  }, [refreshing, thump]);
  const stampStyle = useAnimatedStyle(() => ({
    opacity: refreshing ? 1 : Math.max(0, fill.value),
    transform: [
      { translateY: refreshing ? 0 : (1 - fill.value) * -36 },
      { scale: refreshing ? thump.value : 0.82 + fill.value * 0.18 },
      { rotate: '-8deg' },
    ],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: refreshing ? withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.35, { duration: 400 })), -1, true) : fill.value > 0.85 ? 1 : 0,
  }));
  return (
    <View style={styles.stampWrap}>
      <Animated.View style={[styles.stamp, stampStyle]}>
        <View style={styles.stampInner}>
          <Text style={styles.stampGlyph}>✉</Text>
        </View>
      </Animated.View>
      <Animated.Text style={[styles.stampMark, markStyle]}>EXPLAINED</Animated.Text>
    </View>
  );
}

/** The header refresh visual on web — same stamp, same loop. Wrap it
 *  in the parent's own pressable; this component is visual only. */
export function StampRefreshButton({ refreshing }: { refreshing: boolean }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withSpring(refreshing ? 1 : 0, { damping: 14, stiffness: 200 });
  }, [refreshing, fill]);
  return <StampVisual fill={fill} refreshing={refreshing} />;
}

export function PullToRefresh({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  // 0–1 pull progress; the stamp reads it directly.
  const pull = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      pull.value = Math.min(1, Math.max(0, -event.contentOffset.y / THRESHOLD));
    },
    onEndDrag: (event) => {
      if (event.contentOffset.y < -THRESHOLD) {
        runOnJS(onRefresh)();
      }
    },
  });

  const indicatorStyle = useAnimatedStyle(() => ({
    height: refreshing ? 84 : pull.value * 84,
    opacity: refreshing || pull.value > 0.08 ? 1 : 0,
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.indicator, indicatorStyle]}>
        <StampVisual fill={pull} refreshing={refreshing} />
      </Animated.View>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: { paddingBottom: 140 },
  stampWrap: { alignItems: 'center', justifyContent: 'center' },
  stamp: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
    borderRadius: 28,
    borderWidth: 3,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  stampInner: {
    alignItems: 'center',
    borderColor: palette.primary,
    borderRadius: 20,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stampGlyph: { color: palette.primary, fontSize: 20, fontWeight: '800' },
  stampMark: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginTop: 6,
  },
});
