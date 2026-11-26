import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GridOverlay, GridOverlayMode, nextGridMode } from '@/src/components/GridOverlay';
import { formatMmSs } from '@/src/components/SessionTimerBar';
import { useAppData } from '@/src/context/AppDataContext';
import { REFERENCE_ASSETS } from '@/src/curriculum/assetRegistry';
import { getDayByNumber } from '@/src/curriculum/curriculumService';

const CHIME_ASSET = require('../assets/sounds/chime.wav');
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function ReferenceViewerScreen() {
  useKeepAwake('fullscreen-reference-viewer');

  const { day, index } = useLocalSearchParams<{ day?: string; index?: string }>();
  const dayNumber = Math.min(30, Math.max(1, Number(day) || 1));
  const lesson = getDayByNumber(dayNumber);
  const refs = lesson?.exercise.reference_images ?? [];

  const { addPracticeSeconds } = useAppData();
  const player = useAudioPlayer(CHIME_ASSET);

  const [currentIdx, setCurrentIdx] = useState(() =>
    Math.min(Math.max(0, Number(index) || 0), Math.max(0, refs.length - 1))
  );
  const [grayscale, setGrayscale] = useState(false);
  const [gridMode, setGridMode] = useState<GridOverlayMode>('off');
  const [locked, setLocked] = useState(false);
  const [showHud, setShowHud] = useState(true);

  // Mini Timer inside Fullscreen Viewer (supports Standard or Interval auto-advance)
  const isIntervalDay = lesson?.exercise.timer_mode === 'interval';
  const intervalSec = lesson?.exercise.interval_seconds ?? 60;
  const totalRounds = lesson?.exercise.interval_rounds ?? 20;
  const initialTimerSec = isIntervalDay ? intervalSec : 45 * 60;

  const [timerRunning, setTimerRunning] = useState(false);
  const [remainingSec, setRemainingSec] = useState(initialTimerSec);
  const [round, setRound] = useState(1);
  const endTimeRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const accSecRef = useRef<number>(0);

  // Pan & Zoom shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const resetZoom = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    savedTx.value = 0;
    savedTy.value = 0;
  }, [scale, savedScale, tx, ty, savedTx, savedTy]);

  const flushSeconds = useCallback(() => {
    if (accSecRef.current >= 1) {
      const s = Math.floor(accSecRef.current);
      accSecRef.current -= s;
      if (s > 0) addPracticeSeconds(dayNumber, s);
    }
  }, [addPracticeSeconds, dayNumber]);

  const playChime = useCallback(() => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Ignore audio edge errors
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [player]);

  useEffect(() => {
    return () => {
      flushSeconds();
    };
  }, [flushSeconds]);

  useEffect(() => {
    if (!timerRunning) {
      endTimeRef.current = null;
      return;
    }

    endTimeRef.current = Date.now() + remainingSec * 1000;
    lastTickRef.current = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      accSecRef.current += delta;
      if (accSecRef.current >= 15) flushSeconds();

      if (!endTimeRef.current) return;
      const left = Math.max(0, (endTimeRef.current - now) / 1000);
      setRemainingSec(left);

      if (left <= 0.05) {
        playChime();
        flushSeconds();

        if (isIntervalDay && round < totalRounds) {
          setRound((r) => r + 1);
          setRemainingSec(intervalSec);
          endTimeRef.current = Date.now() + intervalSec * 1000;
          if (refs.length > 1) {
            setCurrentIdx((idx) => (idx + 1) % refs.length);
            resetZoom();
          }
        } else {
          setTimerRunning(false);
          setRemainingSec(0);
        }
      }
    }, 250);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, isIntervalDay, round, totalRounds, intervalSec, refs.length]);

  const toggleHud = useCallback(() => {
    setShowHud((v) => !v);
  }, []);

  const pinchGesture = Gesture.Pinch()
    .enabled(!locked)
    .onUpdate((e) => {
      scale.value = Math.min(5, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .enabled(!locked)
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(!locked)
    .onEnd(() => {
      runOnJS(resetZoom)();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTapGesture)
    .onEnd(() => {
      runOnJS(toggleHud)();
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const currentRef = refs[currentIdx];
  const pair = currentRef ? REFERENCE_ASSETS[currentRef.asset_id] : undefined;
  const imgSource = pair ? (grayscale ? pair.gray : pair.color) : undefined;

  const goPrev = () => {
    if (refs.length <= 1) return;
    setCurrentIdx((i) => (i - 1 + refs.length) % refs.length);
    resetZoom();
  };

  const goNext = () => {
    if (refs.length <= 1) return;
    setCurrentIdx((i) => (i + 1) % refs.length);
    resetZoom();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.stage}>
          {imgSource ? (
            <Animated.View style={[styles.imageWrap, animatedStyle]}>
              <Image source={imgSource} style={styles.fullImage} resizeMode="contain" />
            </Animated.View>
          ) : (
            <Text style={styles.emptyText}>No reference image found.</Text>
          )}
          <GridOverlay mode={gridMode} />
        </View>
      </GestureDetector>

      {/* Top HUD */}
      {showHud && (
        <View style={styles.topHud}>
          <Pressable
            onPress={() => {
              flushSeconds();
              router.back();
            }}
            style={styles.hudCircle}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.titleBox}>
            <Text style={styles.titleText} numberOfLines={1}>
              {currentRef?.title ?? `Day ${dayNumber}`}
            </Text>
            <Text style={styles.counterText}>
              {refs.length > 0 ? `${currentIdx + 1} / ${refs.length}` : ''}
              {isIntervalDay ? ` • Round ${round}/${totalRounds}` : ''}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (timerRunning) {
                flushSeconds();
                setTimerRunning(false);
              } else {
                if (remainingSec <= 0) {
                  setRemainingSec(initialTimerSec);
                  setRound(1);
                }
                setTimerRunning(true);
              }
            }}
            style={[
              styles.timerPill,
              timerRunning && { backgroundColor: '#BA623E' },
            ]}>
            <Ionicons name={timerRunning ? 'pause' : 'play'} size={14} color="#FFFFFF" />
            <Text style={styles.timerPillText}>{formatMmSs(remainingSec)}</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom Artist Toolbar */}
      {showHud && (
        <View style={styles.bottomHud}>
          <Pressable
            onPress={() => setGrayscale((g) => !g)}
            style={[styles.toolBtn, grayscale && styles.toolBtnActive]}>
            <Ionicons name="contrast-outline" size={20} color="#FFFFFF" />
            <Text style={styles.toolLabel}>{grayscale ? 'Gray ON' : 'Value'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setGridMode((m) => nextGridMode(m))}
            style={[styles.toolBtn, gridMode !== 'off' && styles.toolBtnActive]}>
            <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
            <Text style={styles.toolLabel}>
              {gridMode === 'off' ? 'Grid' : gridMode === 'thirds' ? '3×3' : 'Cross'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setLocked((l) => !l)}
            style={[styles.toolBtn, locked && styles.toolBtnActive]}>
            <Ionicons name={locked ? 'lock-closed' : 'lock-open-outline'} size={20} color="#FFFFFF" />
            <Text style={styles.toolLabel}>{locked ? 'Locked' : 'Lock'}</Text>
          </Pressable>

          {refs.length > 1 && (
            <>
              <Pressable onPress={goPrev} style={styles.toolBtn}>
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                <Text style={styles.toolLabel}>Prev</Text>
              </Pressable>

              <Pressable onPress={goNext} style={styles.toolBtn}>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                <Text style={styles.toolLabel}>Next</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    width: SCREEN_W,
    height: SCREEN_H * 0.82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    color: '#AAA',
    fontSize: 15,
  },
  topHud: {
    position: 'absolute',
    top: 44,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hudCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,20,20,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  titleText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  counterText: { color: '#C6C4BC', fontSize: 11 },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20,20,20,0.78)',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
  },
  timerPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bottomHud: {
    position: 'absolute',
    bottom: 24,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(20,20,20,0.82)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  toolBtnActive: {
    backgroundColor: '#BA623E',
  },
  toolLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
