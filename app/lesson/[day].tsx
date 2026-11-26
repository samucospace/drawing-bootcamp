import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ConceptDiagram } from '@/src/components/ConceptDiagram';
import { SessionTimerBar } from '@/src/components/SessionTimerBar';
import { useAppData } from '@/src/context/AppDataContext';
import { REFERENCE_ASSETS } from '@/src/curriculum/assetRegistry';
import { getDayByNumber } from '@/src/curriculum/curriculumService';
import { ConceptImage } from '@/src/curriculum/types';
import {
  pickAndSaveSketchFromCamera,
  pickAndSaveSketchFromLibrary,
} from '@/src/services/sketchStorage';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function LessonScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNumber = Math.min(30, Math.max(1, Number(day) || 1));
  const lesson = getDayByNumber(dayNumber);

  const { colors } = useAppTheme();
  const {
    profile,
    progressMap,
    sketches,
    toggleTheory,
    toggleExercise,
    addPracticeSeconds,
    saveNotes,
    addSketch,
  } = useAppData();

  const progress = progressMap[dayNumber];
  const daySketches = sketches.filter((s) => s.day_number === dayNumber);

  const [tab, setTab] = useState<'theory' | 'exercise'>('theory');
  const [notesDraft, setNotesDraft] = useState(progress?.user_notes ?? '');
  const [expandedConcept, setExpandedConcept] = useState<ConceptImage | null>(null);

  useEffect(() => {
    setNotesDraft(progress?.user_notes ?? '');
  }, [dayNumber, progress?.user_notes]);

  if (!lesson) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Lesson not found.</Text>
      </View>
    );
  }

  const theoryDone = progress?.theory_completed ?? false;
  const exerciseDone = progress?.exercise_completed ?? false;
  const bothDone = theoryDone && exerciseDone;

  const handleLogSketch = () => {
    Alert.alert('Log Sketch Photo', 'Capture or select a photo of your drawing for this day.', [
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const uri = await pickAndSaveSketchFromCamera(dayNumber);
            if (uri) await addSketch(dayNumber, uri);
          } catch (err) {
            Alert.alert('Camera Error', err instanceof Error ? err.message : String(err));
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          try {
            const uri = await pickAndSaveSketchFromLibrary(dayNumber);
            if (uri) await addSketch(dayNumber, uri);
          } catch (err) {
            Alert.alert('Library Error', err instanceof Error ? err.message : String(err));
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: `Day ${lesson.day_number}: ${lesson.title}` }} />

      {/* Segmented Control */}
      <View
        style={[
          styles.segmentedWrap,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}>
        <Pressable
          onPress={() => setTab('theory')}
          style={[
            styles.segBtn,
            { backgroundColor: tab === 'theory' ? colors.accent : colors.surfaceAlt },
          ]}>
          <Ionicons
            name={theoryDone ? 'checkmark-circle' : 'book-outline'}
            size={16}
            color={tab === 'theory' ? colors.accentText : theoryDone ? colors.success : colors.textMuted}
          />
          <Text
            style={[
              styles.segText,
              { color: tab === 'theory' ? colors.accentText : colors.text },
            ]}>
            Theory (15m)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('exercise')}
          style={[
            styles.segBtn,
            { backgroundColor: tab === 'exercise' ? colors.accent : colors.surfaceAlt },
          ]}>
          <Ionicons
            name={exerciseDone ? 'checkmark-circle' : 'brush-outline'}
            size={16}
            color={
              tab === 'exercise' ? colors.accentText : exerciseDone ? colors.success : colors.textMuted
            }
          />
          <Text
            style={[
              styles.segText,
              { color: tab === 'exercise' ? colors.accentText : colors.text },
            ]}>
            Exercise (45m)
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerMetaRow}>
          <Text style={[styles.weekTag, { color: colors.accent }]}>
            {lesson.week === 5 ? 'CAPSTONE' : `WEEK ${lesson.week}`} • {lesson.week_title.toUpperCase()}
          </Text>
          {!!progress?.time_spent_seconds && (
            <Text style={[styles.timeTag, { color: colors.textMuted }]}>
              {Math.max(1, Math.round(progress.time_spent_seconds / 60))}m logged
            </Text>
          )}
        </View>

        {tab === 'theory' ? (
          <View style={styles.phaseStack}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Core Concept</Text>
              <Text style={[styles.bodyText, { color: colors.text }]}>{lesson.theory.summary}</Text>

              <View style={styles.pointsList}>
                {lesson.theory.key_points.map((pt, i) => (
                  <View key={i} style={styles.pointRow}>
                    <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.pointText, { color: colors.text }]}>{pt}</Text>
                  </View>
                ))}
              </View>
            </View>

            {lesson.theory.concept_images.map((img) => (
              <Pressable
                key={img.id}
                onPress={() => setExpandedConcept(img)}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Concept Diagram</Text>
                  <Ionicons name="expand-outline" size={18} color={colors.textMuted} />
                </View>
                <ConceptDiagram diagramId={img.diagram_id} height={180} />
                <Text style={[styles.caption, { color: colors.textMuted }]}>{img.caption}</Text>
              </Pressable>
            ))}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>15-Minute Warm-Up Drill</Text>
              <Text style={[styles.bodyText, { color: colors.text }]}>{lesson.theory.warmup_drill}</Text>
            </View>

            <Pressable
              onPress={() => toggleTheory(dayNumber, !theoryDone)}
              style={[
                styles.checkBtn,
                {
                  backgroundColor: theoryDone ? colors.successSoft : colors.surface,
                  borderColor: theoryDone ? colors.success : colors.border,
                },
              ]}>
              <Ionicons
                name={theoryDone ? 'checkbox' : 'square-outline'}
                size={22}
                color={theoryDone ? colors.success : colors.textMuted}
              />
              <Text style={[styles.checkBtnText, { color: theoryDone ? colors.success : colors.text }]}>
                {theoryDone ? 'Theory & Warm-Up Completed' : 'Mark Theory & Warm-Up Complete'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.phaseStack}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>45-Minute Deliberate Practice</Text>
              <Text style={[styles.bodyText, { color: colors.text }]}>
                {lesson.exercise.instructions}
              </Text>
              {lesson.exercise.timer_mode === 'interval' && (
                <View style={[styles.intervalNote, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="timer-outline" size={16} color={colors.warning} />
                  <Text style={[styles.intervalNoteText, { color: colors.warning }]}>
                    Interval Mode: {lesson.exercise.interval_rounds ?? 20} ×{' '}
                    {lesson.exercise.interval_seconds ?? 60}s poses (auto-advances in Fullscreen Viewer)
                  </Text>
                </View>
              )}
            </View>

            {/* Reference Image Gallery */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Reference Gallery ({lesson.exercise.reference_images.length})
                </Text>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/viewer', params: { day: String(dayNumber), index: '0' } })
                  }>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>
                    Open Fullscreen
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.refGallery}>
                {lesson.exercise.reference_images.map((ref, idx) => {
                  const asset = REFERENCE_ASSETS[ref.asset_id];
                  return (
                    <Pressable
                      key={ref.id}
                      onPress={() =>
                        router.push({
                          pathname: '/viewer',
                          params: { day: String(dayNumber), index: String(idx) },
                        })
                      }
                      style={[styles.refCard, { borderColor: colors.border }]}>
                      {asset && <Image source={asset.color} style={styles.refThumb} />}
                      <View style={styles.refMeta}>
                        <Text style={[styles.refTitle, { color: colors.text }]} numberOfLines={2}>
                          {ref.title}
                        </Text>
                        <Text style={[styles.refAttr, { color: colors.textMuted }]} numberOfLines={1}>
                          Tap to zoom • Grayscale • Grid
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Complete Toggle */}
            <Pressable
              onPress={() => toggleExercise(dayNumber, !exerciseDone)}
              style={[
                styles.checkBtn,
                {
                  backgroundColor: exerciseDone ? colors.successSoft : colors.surface,
                  borderColor: exerciseDone ? colors.success : colors.border,
                },
              ]}>
              <Ionicons
                name={exerciseDone ? 'checkbox' : 'square-outline'}
                size={22}
                color={exerciseDone ? colors.success : colors.textMuted}
              />
              <Text
                style={[styles.checkBtnText, { color: exerciseDone ? colors.success : colors.text }]}>
                {exerciseDone ? 'Main Exercise Completed' : 'Mark Main Exercise Complete'}
              </Text>
            </Pressable>

            {/* Log Sketch Proof */}
            <Pressable
              onPress={handleLogSketch}
              style={[
                styles.sketchBtn,
                {
                  backgroundColor: bothDone ? colors.accent : colors.surface,
                  borderColor: bothDone ? colors.accent : colors.border,
                },
              ]}>
              <Ionicons
                name="camera-outline"
                size={20}
                color={bothDone ? colors.accentText : colors.text}
              />
              <Text
                style={[
                  styles.sketchBtnText,
                  { color: bothDone ? colors.accentText : colors.text },
                ]}>
                {daySketches.length > 0
                  ? `Log Another Sketch (${daySketches.length} saved)`
                  : 'Log Your Sketchbook Photo'}
              </Text>
            </Pressable>

            {/* Self-Reflection Notes */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Self-Reflection Notes</Text>
              <TextInput
                multiline
                value={notesDraft}
                onChangeText={setNotesDraft}
                onEndEditing={() => saveNotes(dayNumber, notesDraft)}
                placeholder="What worked well today? What needs another try tomorrow?"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.notesInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <SessionTimerBar
        dayNumber={dayNumber}
        activeTab={tab}
        exerciseTimerMode={lesson.exercise.timer_mode}
        intervalSeconds={lesson.exercise.interval_seconds}
        intervalRounds={lesson.exercise.interval_rounds ?? 20}
        keepAwakeEnabled={profile?.keep_awake_default ?? true}
        onLogSeconds={(secs) => addPracticeSeconds(dayNumber, secs)}
      />

      {/* Expandable Concept Diagram Modal */}
      <Modal visible={!!expandedConcept} transparent animationType="fade">
        <Pressable style={styles.conceptModal} onPress={() => setExpandedConcept(null)}>
          {expandedConcept && (
            <View style={[styles.conceptModalCard, { backgroundColor: colors.surface }]}>
              <ConceptDiagram diagramId={expandedConcept.diagram_id} height={260} />
              <Text style={[styles.caption, { color: colors.text, marginTop: 10 }]}>
                {expandedConcept.caption}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                Tap anywhere to close
              </Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  segmentedWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segText: { fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 28, gap: 12 },
  headerMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  timeTag: { fontSize: 12, fontWeight: '600' },
  phaseStack: { gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  bodyText: { fontSize: 15, lineHeight: 22 },
  pointsList: { gap: 8, marginTop: 4 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  pointText: { flex: 1, fontSize: 14, lineHeight: 21 },
  caption: { fontSize: 13, lineHeight: 18 },
  intervalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  intervalNoteText: { flex: 1, fontSize: 12, fontWeight: '600' },
  refGallery: { gap: 12, paddingTop: 4 },
  refCard: {
    width: 170,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  refThumb: { width: 170, height: 150, backgroundColor: '#222' },
  refMeta: { padding: 10, gap: 2 },
  refTitle: { fontSize: 13, fontWeight: '700' },
  refAttr: { fontSize: 11 },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkBtnText: { fontSize: 15, fontWeight: '700' },
  sketchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sketchBtnText: { fontSize: 14, fontWeight: '700' },
  notesInput: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  conceptModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  conceptModalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
});
