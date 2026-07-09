/**
 * SegmentHistory — Horizontal row of completed segment chips
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS, getIRIColor, getIRILabel, RADIUS } from '../utils/theme';

export default function SegmentHistory({ segments = [] }) {
  if (segments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Segments will appear here securely processed online.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      nestedScrollEnabled={true}
    >
      {segments.slice(-20).map((seg, i) => {
        const color = getIRIColor(seg.iri_value);
        const label = getIRILabel(seg.iri_value);
        return (
          <View
            key={i}
            style={[styles.chip, { borderColor: color + '40', backgroundColor: COLORS.bg2 }]}
          >
            <Text style={[styles.segNum, { color: COLORS.textMuted }]}>
              #{seg.segment_index + 1}
            </Text>
            <Text style={[styles.iriVal, { color }]}>
              {seg.iri_value != null ? seg.iri_value.toFixed(1) : '—'}
            </Text>
            <Text style={[styles.cond, { color: color }]}>{label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: 'center',
  },
  empty: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    borderRadius: RADIUS.md,
    borderStyle: 'dashed',
    backgroundColor: COLORS.bg2,
  },
  emptyText: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    minWidth: 60,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segNum: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  iriVal: {
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  cond: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
