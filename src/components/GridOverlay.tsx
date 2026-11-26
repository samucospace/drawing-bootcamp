import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

export type GridOverlayMode = 'off' | 'thirds' | 'crosshair';

export function nextGridMode(mode: GridOverlayMode): GridOverlayMode {
  if (mode === 'off') return 'thirds';
  if (mode === 'thirds') return 'crosshair';
  return 'off';
}

export function GridOverlay({ mode }: { mode: GridOverlayMode }) {
  if (mode === 'off') return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="none">
        {mode === 'thirds' ? (
          <>
            <Line x1="100" y1="0" x2="100" y2="300" stroke="rgba(255,255,255,0.52)" strokeWidth="1" />
            <Line x1="200" y1="0" x2="200" y2="300" stroke="rgba(255,255,255,0.52)" strokeWidth="1" />
            <Line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.52)" strokeWidth="1" />
            <Line x1="0" y1="200" x2="300" y2="200" stroke="rgba(255,255,255,0.52)" strokeWidth="1" />
          </>
        ) : (
          <>
            <Line x1="150" y1="0" x2="150" y2="300" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" strokeDasharray="4 4" />
            <Line x1="0" y1="150" x2="300" y2="150" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" strokeDasharray="4 4" />
          </>
        )}
      </Svg>
    </View>
  );
}
