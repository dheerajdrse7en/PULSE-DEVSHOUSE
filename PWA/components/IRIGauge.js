/**
 * IRIGauge — Large IRI display with condition label and color
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, getIRIColor, getIRILabel, getIRIAction, formatIRI } from '../utils/theme';

export default function IRIGauge({ iri, isValid = true, style }) {
  const color = getIRIColor(iri);
  const label = getIRILabel(iri);
  const action = getIRIAction(iri);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.unit}>IRI  m/km</Text>
      <View style={[styles.valueContainer, { borderColor: color }]}>
        <Text style={[styles.value, { color }]}>
          {isValid ? formatIRI(iri) : '—'}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
      <Text style={styles.action}>{isValid ? action : 'SPEED < 20 km/h'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  unit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  valueContainer: {
    borderBottomWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  value: {
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  action: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginTop: 4,
  },
});
