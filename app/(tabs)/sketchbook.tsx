import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppData } from '@/src/context/AppDataContext';
import { getDayByNumber } from '@/src/curriculum/curriculumService';
import { SketchUpload } from '@/src/repositories/types';
import {
  pickAndSaveSketchFromCamera,
  pickAndSaveSketchFromLibrary,
} from '@/src/services/sketchStorage';
import { useAppTheme } from '@/src/theme/ThemeContext';

type WeekFilter = 'all' | 1 | 2 | 3 | 4 | 5;

export default function SketchbookScreen() {
  const { colors } = useAppTheme();
  const { sketches, progressMap, stats, addSketch, deleteSketch } = useAppData();

  const [filter, setFilter] = useState<WeekFilter>('all');
  const [selectedSketch, setSelectedSketch] = useState<SketchUpload | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [targetDay, setTargetDay] = useState<number>(stats.nextDayNumber);

  const filteredSketches = useMemo(() => {
    if (filter === 'all') return sketches;
    return sketches.filter((s) => getDayByNumber(s.day_number)?.week === filter);
  }, [filter, sketches]);

  // Earliest & latest uploaded sketches for "Day 1 vs. Day 30" progress comparison
  const comparisonPair = useMemo(() => {
    if (sketches.length < 2) return null;
    const sorted = [...sketches].sort((a, b) =>
      a.day_number !== b.day_number
        ? a.day_number - b.day_number
        : a.created_at.localeCompare(b.created_at)
    );
    return {
      first: sorted[0],
      latest: sorted[sorted.length - 1],
    };
  }, [sketches]);

  const handleUpload = async (source: 'camera' | 'library') => {
    try {
      const savedUri =
        source === 'camera'
          ? await pickAndSaveSketchFromCamera(targetDay)
          : await pickAndSaveSketchFromLibrary(targetDay);
      if (savedUri) {
        await addSketch(targetDay, savedUri);
        setShowAddPicker(false);
      }
    } catch (err) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : String(err));
    }
  };

  const confirmDelete = (sketch: SketchUpload) => {
    Alert.alert('Remove Sketch?', `Remove this Day ${sketch.day_number} sketch from your journal?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteSketch(sketch.id);
          setSelectedSketch(null);
        },
      },
    ]);
  };

  const filters: { id: WeekFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 1, label: 'Week 1' },
    { id: 2, label: 'Week 2' },
    { id: 3, label: 'Week 3' },
    { id: 4, label: 'Week 4' },
    { id: 5, label: 'Capstone' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Toolbar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            setTargetDay(stats.nextDayNumber);
            setShowAddPicker(true);
          }}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}>
          <Ionicons name="camera-outline" size={18} color={colors.accentText} />
          <Text style={[styles.addBtnText, { color: colors.accentText }]}>Log Sketch</Text>
        </Pressable>

        {comparisonPair && (
          <Pressable
            onPress={() => setShowCompare(true)}
            style={[
              styles.compareBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Ionicons name="git-compare-outline" size={18} color={colors.text} />
            <Text style={[styles.compareBtnText, { color: colors.text }]}>
              Compare Day {comparisonPair.first.day_number} vs {comparisonPair.latest.day_number}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Week Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}>
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={String(f.id)}
              onPress={() => setFilter(f.id)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}>
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.accentText : colors.textMuted },
                ]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filteredSketches.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="book-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your Sketchbook is Empty</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Photograph your physical sketchbook after each daily lesson to build a 30-day visual timeline.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSketches}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedSketch(item)}
              style={[
                styles.gridCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Image source={{ uri: item.local_file_uri }} style={styles.gridImage} />
              <View style={styles.gridMeta}>
                <Text style={[styles.gridDay, { color: colors.accent }]}>
                  Day {item.day_number}
                </Text>
                <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>
                  {getDayByNumber(item.day_number)?.title ?? ''}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Add Sketch Day Selector Modal */}
      <Modal visible={showAddPicker} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Log Sketch Photo</Text>
            <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
              Select which day this drawing belongs to:
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayChipList}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
                const active = d === targetDay;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setTargetDay(d)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: active ? colors.accent : colors.surfaceAlt,
                      },
                    ]}>
                    <Text
                      style={{
                        color: active ? colors.accentText : colors.text,
                        fontWeight: '700',
                      }}>
                      Day {d}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => handleUpload('camera')}
                style={[styles.sheetBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="camera" size={18} color={colors.accentText} />
                <Text style={[styles.sheetBtnText, { color: colors.accentText }]}>Take Photo</Text>
              </Pressable>

              <Pressable
                onPress={() => handleUpload('library')}
                style={[
                  styles.sheetBtn,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 },
                ]}>
                <Ionicons name="images" size={18} color={colors.text} />
                <Text style={[styles.sheetBtnText, { color: colors.text }]}>Choose from Library</Text>
              </Pressable>

              <Pressable onPress={() => setShowAddPicker(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Single Sketch Preview Modal */}
      <Modal visible={!!selectedSketch} transparent animationType="fade">
        {selectedSketch && (
          <View style={styles.previewModal}>
            <View style={styles.previewTopBar}>
              <Pressable onPress={() => setSelectedSketch(null)} style={styles.previewIconBtn}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.previewTitle}>
                Day {selectedSketch.day_number}: {getDayByNumber(selectedSketch.day_number)?.title}
              </Text>
              <Pressable onPress={() => confirmDelete(selectedSketch)} style={styles.previewIconBtn}>
                <Ionicons name="trash-outline" size={22} color="#FF8A80" />
              </Pressable>
            </View>

            <Image
              source={{ uri: selectedSketch.local_file_uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />

            {!!progressMap[selectedSketch.day_number]?.user_notes && (
              <View style={styles.previewNotesBox}>
                <Text style={styles.previewNotesLabel}>Reflection Notes</Text>
                <Text style={styles.previewNotesText}>
                  {progressMap[selectedSketch.day_number]?.user_notes}
                </Text>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Day 1 vs Day 30 Comparison Modal */}
      <Modal visible={showCompare} transparent animationType="slide">
        {comparisonPair && (
          <View style={styles.previewModal}>
            <View style={styles.previewTopBar}>
              <Pressable onPress={() => setShowCompare(false)} style={styles.previewIconBtn}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.previewTitle}>Progress Comparison</Text>
              <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={styles.compareScroll}>
              <View style={styles.comparePane}>
                <Text style={styles.compareLabel}>
                  Day {comparisonPair.first.day_number} •{' '}
                  {getDayByNumber(comparisonPair.first.day_number)?.title}
                </Text>
                <Image
                  source={{ uri: comparisonPair.first.local_file_uri }}
                  style={styles.compareImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.comparePane}>
                <Text style={styles.compareLabel}>
                  Day {comparisonPair.latest.day_number} •{' '}
                  {getDayByNumber(comparisonPair.latest.day_number)?.title}
                </Text>
                <Image
                  source={{ uri: comparisonPair.latest.local_file_uri }}
                  style={styles.compareImage}
                  resizeMode="contain"
                />
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  compareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  compareBtnText: { fontSize: 13, fontWeight: '600' },
  filterScroll: { maxHeight: 52 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: '600' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  gridContent: { padding: 16, gap: 12 },
  gridRow: { gap: 12 },
  gridCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridImage: { width: '100%', aspectRatio: 1, backgroundColor: '#222' },
  gridMeta: { padding: 10, gap: 2 },
  gridDay: { fontSize: 11, fontWeight: '700' },
  gridTitle: { fontSize: 13, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSub: { fontSize: 13 },
  dayChipList: { gap: 8, paddingVertical: 6 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  sheetActions: { gap: 10, marginTop: 6 },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  sheetBtnText: { fontSize: 15, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  previewModal: { flex: 1, backgroundColor: '#121212', paddingTop: 42 },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  previewIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  previewImage: { flex: 1, width: '100%' },
  previewNotesBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: 16,
    padding: 12,
    borderRadius: 12,
  },
  previewNotesLabel: { color: '#D47B56', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  previewNotesText: { color: '#F0EFEA', fontSize: 13, lineHeight: 19 },
  compareScroll: { padding: 16, gap: 16 },
  comparePane: { gap: 8 },
  compareLabel: { color: '#F0EFEA', fontSize: 14, fontWeight: '700' },
  compareImage: { width: '100%', height: 280, borderRadius: 12, backgroundColor: '#1E1E1E' },
});
