/// <reference types="node" />
import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { getAllDays, getDayByNumber, getWeeksGrouped } from '../curriculum/curriculumService';
import { computeCourseStats, deriveDayStatus, validateBackupPayload } from '../domain/progressStats';
import { DayProgress } from '../repositories/types';

function makeProgress(overrides: Partial<DayProgress>): DayProgress {
  return {
    id: 'p-1',
    user_id: 'u-1',
    day_number: 1,
    theory_completed: false,
    exercise_completed: false,
    status: 'not_started',
    time_spent_seconds: 0,
    user_notes: '',
    completed_at: null,
    updated_at: '2026-11-26T00:00:00.000Z',
    sync_status: 'local_only',
    ...overrides,
  };
}

describe('30-Day Curriculum Integrity', () => {
  it('contains all 30 sequential days grouped into 5 sections', () => {
    const days = getAllDays();
    expect(days).toHaveLength(30);
    days.forEach((d, idx) => {
      expect(d.day_number).toBe(idx + 1);
      expect(d.theory.key_points.length).toBeGreaterThan(0);
      expect(d.theory.concept_images.length).toBeGreaterThan(0);
      expect(d.exercise.reference_images.length).toBeGreaterThan(0);
    });

    const weeks = getWeeksGrouped();
    expect(weeks).toHaveLength(5);
    expect(weeks[4].days.map((d) => d.day_number)).toEqual([29, 30]);
  });

  it('configures Day 15 for gesture interval timer with 6 pose plates', () => {
    const day15 = getDayByNumber(15);
    expect(day15).toBeDefined();
    expect(day15?.exercise.timer_mode).toBe('interval');
    expect(day15?.exercise.interval_seconds).toBe(60);
    expect(day15?.exercise.reference_images.length).toBe(6);
  });

  it('has color and grayscale PNG assets on disk for every reference_image', () => {
    const refsDir = path.resolve(__dirname, '../../assets/references');
    for (const day of getAllDays()) {
      for (const ref of day.exercise.reference_images) {
        const colorFile = path.join(refsDir, `${ref.asset_id}.png`);
        const grayFile = path.join(refsDir, `${ref.asset_id}_gray.png`);
        expect(fs.existsSync(colorFile)).toBe(true);
        expect(fs.existsSync(grayFile)).toBe(true);
      }
    }
  });
});

describe('Domain Progress & Streak Logic', () => {
  it('derives day status transitions accurately', () => {
    expect(deriveDayStatus(false, false, 0, '')).toBe('not_started');
    expect(deriveDayStatus(true, false, 0, '')).toBe('in_progress');
    expect(deriveDayStatus(false, false, 120, '')).toBe('in_progress');
    expect(deriveDayStatus(false, false, 0, 'Good line weight')).toBe('in_progress');
    expect(deriveDayStatus(true, true, 900, '')).toBe('completed');
  });

  it('computes streak, hours, and next uncompleted day', () => {
    const now = new Date('2026-11-26T12:00:00');
    const list: DayProgress[] = [
      makeProgress({
        day_number: 1,
        theory_completed: true,
        exercise_completed: true,
        status: 'completed',
        time_spent_seconds: 3600,
        completed_at: '2026-11-24T19:00:00',
      }),
      makeProgress({
        day_number: 2,
        theory_completed: true,
        exercise_completed: true,
        status: 'completed',
        time_spent_seconds: 1800,
        completed_at: '2026-11-25T19:30:00',
      }),
      makeProgress({
        day_number: 4,
        theory_completed: true,
        exercise_completed: false,
        status: 'in_progress',
        time_spent_seconds: 900,
      }),
    ];

    const stats = computeCourseStats(list, now);
    expect(stats.completedDays).toBe(2);
    expect(stats.inProgressDays).toBe(1);
    expect(stats.currentStreak).toBe(2); // 24th + 25th keeps streak alive on 26th
    expect(stats.nextDayNumber).toBe(3); // Day 3 is first uncompleted
    expect(stats.totalHoursFormatted).toBe('1.8h');
  });

  it('resets streak to 0 when the last completed day was two days ago', () => {
    const now = new Date('2026-11-26T12:00:00');
    const list: DayProgress[] = [
      makeProgress({
        day_number: 1,
        theory_completed: true,
        exercise_completed: true,
        status: 'completed',
        completed_at: '2026-11-24T19:00:00',
      }),
    ];
    expect(computeCourseStats(list, now).currentStreak).toBe(0);
  });

  it('validates backup payload schema cleanly', () => {
    expect(() => validateBackupPayload(null)).toThrow();
    expect(() => validateBackupPayload({ schema_version: 99 })).toThrow();

    const valid = validateBackupPayload({
      schema_version: 1,
      exported_at: '2026-11-26T00:00:00.000Z',
      course_version: '1.0.0',
      day_progress: [],
      sketch_uploads: [],
    });
    expect(valid.schema_version).toBe(1);
  });
});
