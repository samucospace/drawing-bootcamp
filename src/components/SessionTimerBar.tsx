import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TimerMode } from '../curriculum/types';
import { useAppTheme } from '../theme/ThemeContext';

const CHIME_ASSET = require('../../assets/sounds/chime.wav');
const KEEP_AWAKE_TAG = 'drawing-session-timer';

export type TimerPreset = 'warmup' | 'exercise' | 'interval';

interface SessionTimerBarProps {
  dayNumber: number;
  activeTab: 'theory' | 'exercise';
  exerciseTimerMode: TimerMode;
  intervalSeconds: number | null;
  intervalRounds: number;
  keepAwakeEnabled: boolean;
  onLogSeconds: (seconds: number) => void;
  onIntervalAdvance?: () => void;
}

export function formatMmSs(totalSec: number): string {
  const clamped = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SessionTimerBar({
  dayNumber,
  activeTab,
  exerciseTimerMode,
  intervalSeconds,
  intervalRounds,
  keepAwakeEnabled,
  onLogSeconds,
  onIntervalAdvance,
}: SessionTimerBarProps) {
  const { colors } = useAppTheme();
  const player = useAudioPlayer(CHIME_ASSET);

  const defaultPreset: TimerPreset =
    activeTab === 'theory'
      ? 'warmup'
      : exerciseTimerMode === 'interval'
        ? 'interval'
        : 'exercise';

  const [preset, setPreset] = useState<TimerPreset>(defaultPreset);
  const intervalDuration = intervalSeconds ?? 60;
  const totalRounds = Math.max(1, intervalRounds || 20);

  const getInitialDuration = useCallback(
    (p: TimerPreset) => {
      if (p === 'warmup') return 15 * 60;
      if (p === 'interval') return intervalDuration;
      return 45 * 60;
    },
    [intervalDuration]
  );

  const [remainingSec, setRemainingSec] = useState<number>(() => getInitialDuration(defaultPreset));
  const [running, setRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  const endTimeRef = useRef<number | null>(null);
  const lastLoggedTickRef = useRef<number>(Date.now());
  const accumulatedSecRef = useRef<number>(0);

  const playChime = useCallback(() => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Ignore audio edge errors on simulators/muted devices
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [player]);

  const flushLoggedSeconds = useCallback(() => {
    if (accumulatedSecRef.current >= 1) {
      const secs = Math.floor(accumulatedSecRef.current);
      accumulatedSecRef.current -= secs;
      if (secs > 0) {
        onLogSeconds(secs);
      }
    }
  }, [onLogSeconds]);

  // Switch default preset cleanly when user switches tab while timer is idle
  useEffect(() => {
    if (!running) {
      setPreset(defaultPreset);
      setRemainingSec(getInitialDuration(defaultPreset));
      setCurrentRound(1);
    }
  }, [dayNumber, defaultPreset, getInitialDuration, running]);

  // Manage keep awake while timer runs
  useEffect(() => {
    if (running && keepAwakeEnabled) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    } else {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [running, keepAwakeEnabled]);

  // Flush any logged seconds on unmount
  useEffect(() => {
    return () => {
      flushLoggedSeconds();
    };
  }, [flushLoggedSeconds]);

  // Wall-clock countdown loop
  useEffect(() => {
    if (!running) {
      endTimeRef.current = null;
      return;
    }

    endTimeRef.current = Date.now() + remainingSec * 1000;
    lastLoggedTickRef.current = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastLoggedTickRef.current) / 1000;
      lastLoggedTickRef.current = now;
      accumulatedSecRef.current += deltaSec;

      if (accumulatedSecRef.current >= 15) {
        flushLoggedSeconds();
      }

      if (!endTimeRef.current) return;
      const left = Math.max(0, (endTimeRef.current - now) / 1000);
      setRemainingSec(left);

      if (left <= 0.05) {
        playChime();
        flushLoggedSeconds();

        if (preset === 'interval' && currentRound < totalRounds) {
          const nextRound = currentRound + 1;
          setCurrentRound(nextRound);
          setRemainingSec(intervalDuration);
          endTimeRef.current = Date.now() + intervalDuration * 1000;
          onIntervalAdvance?.();
        } else {
          setRunning(false);
          setRemainingSec(0);
        }
      }
    }, 250);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, preset, currentRound, totalRounds, intervalDuration]);

  const handleSelectPreset = (nextPreset: TimerPreset) => {
    flushLoggedSeconds();
    setRunning(false);
    setPreset(nextPreset);
    setCurrentRound(1);
    setRemainingSec(getInitialDuration(nextPreset));
  };

  const handleToggleRun = () => {
    if (running) {
      flushLoggedSeconds();
      setRunning(false);
    } else {
      if (remainingSec <= 0) {
        setRemainingSec(getInitialDuration(preset));
        setCurrentRound(1);
      }
      setRunning(true);
    }
  };

  const handleReset = () => {
    flushLoggedSeconds();
    setRunning(false);
    setCurrentRound(1);
    setRemainingSec(getInitialDuration(preset));
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <View style={styles.presetRow}>
        <Pressable
          onPress={() => handleSelectPreset('warmup')}
          style={[
            styles.presetChip,
            {
              backgroundColor: preset === 'warmup' ? colors.accent : colors.surfaceAlt,
            },
          ]}>
          <Text
            style={[
              styles.presetText,
              { color: preset === 'warmup' ? colors.accentText : colors.textMuted },
            ]}>
            15m Warm-up
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleSelectPreset('exercise')}
          style={[
            styles.presetChip,
            {
              backgroundColor: preset === 'exercise' ? colors.accent : colors.surfaceAlt,
            },
          ]}>
          <Text
            style={[
              styles.presetText,
              { color: preset === 'exercise' ? colors.accentText : colors.textMuted },
            ]}>
            45m Exercise
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleSelectPreset('interval')}
          style={[
            styles.presetChip,
            {
              backgroundColor: preset === 'interval' ? colors.accent : colors.surfaceAlt,
            },
          ]}>
          <Text
            style={[
              styles.presetText,
              { color: preset === 'interval' ? colors.accentText : colors.textMuted },
            ]}>
            {intervalDuration}s Interval
          </Text>
        </Pressable>
      </View>

      <View style={styles.controlsRow}>
        <View>
          <Text style={[styles.clock, { color: colors.text }]}>{formatMmSs(remainingSec)}</Text>
          {preset === 'interval' ? (
            <Text style={[styles.subLabel, { color: colors.textMuted }]}>
              Round {currentRound} / {totalRounds}
            </Text>
          ) : (
            <Text style={[styles.subLabel, { color: colors.textMuted }]}>
              {running ? 'Screen awake • Counting' : 'Ready to start'}
            </Text>
          )}
        </View>

        <View style={styles.btnGroup}>
          <Pressable
            onPress={handleReset}
            accessibilityLabel="Reset timer"
            style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="refresh" size={18} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={handleToggleRun}
            style={[styles.playBtn, { backgroundColor: colors.accent }]}>
            <Ionicons name={running ? 'pause' : 'play'} size={18} color={colors.accentText} />
            <Text style={[styles.playText, { color: colors.accentText }]}>
              {running ? 'Pause' : 'Start'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clock: {
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    marginTop: 1,
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 20,
  },
  playText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
