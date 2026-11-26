import rawCurriculum from './curriculum.json';
import { CourseCurriculum, CurriculumDay, WeekGroup } from './types';

const curriculum = rawCurriculum as CourseCurriculum;

export function getCurriculum(): CourseCurriculum {
  return curriculum;
}

export function getAllDays(): CurriculumDay[] {
  return curriculum.days;
}

export function getDayByNumber(dayNumber: number): CurriculumDay | undefined {
  return curriculum.days.find((d) => d.day_number === dayNumber);
}

export function getWeeksGrouped(): WeekGroup[] {
  const map = new Map<number, WeekGroup>();
  for (const day of curriculum.days) {
    let group = map.get(day.week);
    if (!group) {
      group = {
        week: day.week,
        week_title: day.week_title,
        days: [],
      };
      map.set(day.week, group);
    }
    group.days.push(day);
  }
  return Array.from(map.values()).sort((a, b) => a.week - b.week);
}
