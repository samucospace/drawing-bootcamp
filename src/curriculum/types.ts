export type TimerMode = 'standard' | 'interval';

export type ConceptDiagramId =
  | 'line_confidence'
  | 'ellipses_perspective'
  | 'five_value_zones'
  | 'perspective_1pt'
  | 'perspective_2pt'
  | 'perspective_3pt'
  | 'form_intersections'
  | 'loomis_head_steps'
  | 'facial_proportions'
  | 'eye_orbital_planes'
  | 'nose_mouth_planes'
  | 'lighting_setups'
  | 'expression_squash_stretch'
  | 'portrait_values'
  | 'gesture_line_of_action'
  | 'torso_bean'
  | 'figure_8_heads'
  | 'foreshortening_overlap'
  | 'arm_leg_cylinders'
  | 'hand_block_construction'
  | 'foot_wedge_planes'
  | 'horizon_rule_of_thirds'
  | 'atmospheric_depth'
  | 'cloud_value_forms'
  | 'foliage_massing'
  | 'water_reflections'
  | 'notan_value_shapes'
  | 'rock_planar_fractures'
  | 'capstone_composition'
  | 'capstone_lighting_narrative';

export interface ConceptImage {
  id: string;
  diagram_id: ConceptDiagramId;
  caption: string;
}

export interface ReferenceImage {
  id: string;
  asset_id: string;
  title: string;
  attribution: string;
  tags: string[];
}

export interface CurriculumDay {
  day_number: number;
  week: number;
  week_title: string;
  title: string;
  theory: {
    duration_minutes: number;
    summary: string;
    key_points: string[];
    warmup_drill: string;
    concept_images: ConceptImage[];
  };
  exercise: {
    duration_minutes: number;
    instructions: string;
    timer_mode: TimerMode;
    interval_seconds: number | null;
    interval_rounds?: number | null;
    reference_images: ReferenceImage[];
  };
}

export interface CourseCurriculum {
  course_version: string;
  title: string;
  days: CurriculumDay[];
}

export interface WeekGroup {
  week: number;
  week_title: string;
  days: CurriculumDay[];
}
