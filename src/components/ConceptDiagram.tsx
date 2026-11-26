import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { ConceptDiagramId } from '../curriculum/types';
import { useAppTheme } from '../theme/ThemeContext';

interface ConceptDiagramProps {
  diagramId: ConceptDiagramId;
  height?: number;
}

export function ConceptDiagram({ diagramId, height = 180 }: ConceptDiagramProps) {
  const { colors } = useAppTheme();
  const ink = colors.diagramStroke;
  const muted = colors.diagramMuted;
  const fill = colors.diagramFill;
  const accent = colors.accent;

  const renderGraphic = () => {
    switch (diagramId) {
      case 'line_confidence':
        return (
          <G>
            {/* Ghosted confident stroke */}
            <Circle cx="36" cy="52" r="4" fill={accent} />
            <Circle cx="284" cy="52" r="4" fill={accent} />
            <Line x1="36" y1="52" x2="284" y2="52" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
            <Path d="M 36 86 Q 160 66 284 86" stroke={ink} strokeWidth="2.2" fill="none" />
            <SvgText x="36" y="34" fill={ink} fontSize="11" fontWeight="600">
              SHOULDER: Single Ghosted Pass
            </SvgText>
            {/* Hesitant wrist stroke */}
            <Path
              d="M 36 138 L 62 135 L 88 141 L 114 136 L 145 142 L 178 135 L 210 141 L 245 137 L 284 140"
              stroke={muted}
              strokeWidth="1.6"
              strokeDasharray="6 3"
              fill="none"
            />
            <SvgText x="36" y="122" fill={muted} fontSize="11">
              WRIST: Hesitant / Scratchy Lines
            </SvgText>
          </G>
        );

      case 'ellipses_perspective':
        return (
          <G>
            <Line x1="20" y1="30" x2="300" y2="30" stroke={muted} strokeWidth="1" strokeDasharray="4 4" />
            <SvgText x="24" y="23" fill={muted} fontSize="10">EYE LEVEL (HORIZON)</SvgText>
            {/* Narrow -> Medium -> Wide ellipses */}
            <Line x1="160" y1="36" x2="160" y2="164" stroke={accent} strokeWidth="1.4" strokeDasharray="4 3" />
            <Ellipse cx="160" cy="52" rx="68" ry="8" stroke={ink} strokeWidth="2" fill="none" />
            <Ellipse cx="160" cy="96" rx="68" ry="18" stroke={ink} strokeWidth="2" fill="none" />
            <Ellipse cx="160" cy="144" rx="68" ry="26" stroke={ink} strokeWidth="2" fill="none" />
            <Line x1="92" y1="52" x2="92" y2="144" stroke={ink} strokeWidth="1.6" />
            <Line x1="228" y1="52" x2="228" y2="144" stroke={ink} strokeWidth="1.6" />
            <SvgText x="240" y="56" fill={muted} fontSize="10">15°</SvgText>
            <SvgText x="240" y="100" fill={muted} fontSize="10">35°</SvgText>
            <SvgText x="240" y="148" fill={muted} fontSize="10">55°</SvgText>
            <SvgText x="168" y="76" fill={accent} fontSize="10">Minor Axis</SvgText>
          </G>
        );

      case 'five_value_zones':
        return (
          <G>
            <Defs>
              <LinearGradient id="sphereGrad" x1="0.2" y1="0.15" x2="0.85" y2="0.85">
                <Stop offset="0%" stopColor="#FFFFFF" />
                <Stop offset="35%" stopColor="#B8B2A8" />
                <Stop offset="66%" stopColor="#3B3936" />
                <Stop offset="88%" stopColor="#6D6962" />
                <Stop offset="100%" stopColor="#4F4C47" />
              </LinearGradient>
            </Defs>
            <Ellipse cx="164" cy="150" rx="68" ry="12" fill={muted} opacity="0.45" />
            <Circle cx="122" cy="96" r="54" fill="url(#sphereGrad)" stroke={ink} strokeWidth="1.5" />
            {/* Labels */}
            <Line x1="100" y1="68" x2="54" y2="42" stroke={accent} strokeWidth="1.2" />
            <SvgText x="12" y="38" fill={ink} fontSize="10">1. Highlight</SvgText>
            <Line x1="126" y1="86" x2="205" y2="45" stroke={muted} strokeWidth="1.2" />
            <SvgText x="210" y="48" fill={ink} fontSize="10">2. Halftone</SvgText>
            <Line x1="146" y1="108" x2="205" y2="88" stroke={accent} strokeWidth="1.2" />
            <SvgText x="210" y="92" fill={ink} fontSize="10">3. Core Shadow</SvgText>
            <Line x1="158" y1="126" x2="205" y2="122" stroke={muted} strokeWidth="1.2" />
            <SvgText x="210" y="126" fill={ink} fontSize="10">4. Reflected Light</SvgText>
            <Line x1="194" y1="150" x2="215" y2="154" stroke={muted} strokeWidth="1.2" />
            <SvgText x="218" y="158" fill={ink} fontSize="10">5. Cast Shadow</SvgText>
          </G>
        );

      case 'perspective_1pt':
        return (
          <G>
            <Line x1="15" y1="68" x2="305" y2="68" stroke={accent} strokeWidth="1.4" strokeDasharray="5 3" />
            <Circle cx="160" cy="68" r="4" fill={accent} />
            <SvgText x="168" y="62" fill={accent} fontSize="10" fontWeight="600">VP</SvgText>
            {/* Perspective rays */}
            <Line x1="160" y1="68" x2="42" y2="155" stroke={muted} strokeWidth="1" />
            <Line x1="160" y1="68" x2="108" y2="155" stroke={muted} strokeWidth="1" />
            <Line x1="160" y1="68" x2="108" y2="102" stroke={muted} strokeWidth="1" />
            <Line x1="160" y1="68" x2="275" y2="145" stroke={muted} strokeWidth="1" />
            <Line x1="160" y1="68" x2="215" y2="145" stroke={muted} strokeWidth="1" />
            {/* Front & back box */}
            <Rect x="42" y="102" width="66" height="53" stroke={ink} strokeWidth="2" fill={fill} fillOpacity="0.45" />
            <Rect x="84" y="88" width="44" height="35" stroke={ink} strokeWidth="1.3" fill="none" strokeDasharray="3 2" />
            <Line x1="42" y1="102" x2="84" y2="88" stroke={ink} strokeWidth="1.6" />
            <Line x1="108" y1="102" x2="128" y2="88" stroke={ink} strokeWidth="1.6" />
            <Line x1="108" y1="155" x2="128" y2="123" stroke={ink} strokeWidth="1.6" />
          </G>
        );

      case 'perspective_2pt':
        return (
          <G>
            <Line x1="12" y1="54" x2="308" y2="54" stroke={accent} strokeWidth="1.3" strokeDasharray="5 3" />
            <Circle cx="26" cy="54" r="4" fill={accent} />
            <Circle cx="294" cy="54" r="4" fill={accent} />
            <SvgText x="18" y="45" fill={accent} fontSize="10">VP-L</SvgText>
            <SvgText x="276" y="45" fill={accent} fontSize="10">VP-R</SvgText>
            {/* Rays */}
            <Line x1="26" y1="54" x2="160" y2="94" stroke={muted} strokeWidth="1" />
            <Line x1="26" y1="54" x2="160" y2="152" stroke={muted} strokeWidth="1" />
            <Line x1="294" y1="54" x2="160" y2="94" stroke={muted} strokeWidth="1" />
            <Line x1="294" y1="54" x2="160" y2="152" stroke={muted} strokeWidth="1" />
            {/* Box faces */}
            <Polygon points="160,94 106,80 106,128 160,152" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Polygon points="160,94 218,78 218,124 160,152" fill={fill} fillOpacity="0.55" stroke={ink} strokeWidth="1.8" />
            <Line x1="160" y1="94" x2="160" y2="152" stroke={accent} strokeWidth="2.4" />
          </G>
        );

      case 'perspective_3pt':
        return (
          <G>
            <Line x1="16" y1="146" x2="304" y2="146" stroke={muted} strokeWidth="1.2" strokeDasharray="4 3" />
            <Circle cx="160" cy="18" r="4" fill={accent} />
            <SvgText x="168" y="22" fill={accent} fontSize="10">VP3 (ZENITH)</SvgText>
            {/* Converging vertical edges */}
            <Line x1="160" y1="18" x2="112" y2="162" stroke={muted} strokeWidth="1" />
            <Line x1="160" y1="18" x2="160" y2="164" stroke={muted} strokeWidth="1" />
            <Line x1="160" y1="18" x2="210" y2="162" stroke={muted} strokeWidth="1" />
            <Polygon points="134,62 160,54 160,156 122,140" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Polygon points="160,54 186,62 200,140 160,156" fill={fill} fillOpacity="0.5" stroke={ink} strokeWidth="1.8" />
          </G>
        );

      case 'form_intersections':
        return (
          <G>
            <Rect x="72" y="64" width="96" height="82" fill={fill} stroke={ink} strokeWidth="2" />
            <Circle cx="182" cy="94" r="46" fill={fill} fillOpacity="0.7" stroke={ink} strokeWidth="2" />
            {/* Seam curve */}
            <Path d="M 168 64 Q 146 92 168 128" stroke={accent} strokeWidth="2.4" fill="none" />
            <Path d="M 136 94 Q 182 110 228 94" stroke={muted} strokeWidth="1.3" strokeDasharray="4 3" fill="none" />
            <SvgText x="74" y="48" fill={ink} fontSize="11">Cross-Contour Seam</SvgText>
          </G>
        );

      case 'loomis_head_steps':
        return (
          <G>
            {[0, 1, 2, 3].map((step) => {
              const cx = 46 + step * 76;
              return (
                <G key={step}>
                  <Circle cx={cx} cy="78" r="26" stroke={ink} strokeWidth="1.7" fill={fill} fillOpacity="0.35" />
                  {step >= 1 && (
                    <Ellipse cx={cx + 12} cy="78" rx="10" ry="18" stroke={accent} strokeWidth="1.5" fill="none" />
                  )}
                  {step >= 2 && (
                    <G>
                      <Path d={`M ${cx - 24} 78 Q ${cx} 86 ${cx + 22} 76`} stroke={ink} strokeWidth="1.5" fill="none" />
                      <Path d={`M ${cx - 4} 52 Q ${cx - 10} 86 ${cx - 4} 118`} stroke={accent} strokeWidth="1.5" fill="none" />
                    </G>
                  )}
                  {step >= 3 && (
                    <Path d={`M ${cx + 12} 96 L ${cx + 4} 124 L ${cx - 16} 126 L ${cx - 24} 95`} stroke={ink} strokeWidth="1.8" fill="none" />
                  )}
                  <SvgText x={cx - 14} y="152" fill={muted} fontSize="10">Step {step + 1}</SvgText>
                </G>
              );
            })}
          </G>
        );

      case 'facial_proportions':
        return (
          <G>
            <Ellipse cx="130" cy="92" rx="44" ry="58" stroke={ink} strokeWidth="2" fill={fill} fillOpacity="0.4" />
            <Line x1="70" y1="50" x2="255" y2="50" stroke={muted} strokeWidth="1" strokeDasharray="3 3" />
            <Line x1="70" y1="78" x2="255" y2="78" stroke={accent} strokeWidth="1.3" />
            <Line x1="70" y1="112" x2="255" y2="112" stroke={accent} strokeWidth="1.3" />
            <Line x1="70" y1="148" x2="255" y2="148" stroke={muted} strokeWidth="1" strokeDasharray="3 3" />
            <Line x1="130" y1="34" x2="130" y2="150" stroke={muted} strokeWidth="1" />
            <SvgText x="195" y="48" fill={muted} fontSize="10">Hairline</SvgText>
            <SvgText x="195" y="76" fill={accent} fontSize="10">Brow (1/3)</SvgText>
            <SvgText x="195" y="110" fill={accent} fontSize="10">Nose Base (2/3)</SvgText>
            <SvgText x="195" y="146" fill={muted} fontSize="10">Chin (3/3)</SvgText>
          </G>
        );

      case 'eye_orbital_planes':
        return (
          <G>
            <Circle cx="160" cy="92" r="46" stroke={muted} strokeWidth="1.4" strokeDasharray="4 3" fill={fill} />
            <Circle cx="160" cy="92" r="18" stroke={ink} strokeWidth="1.6" fill={muted} fillOpacity="0.45" />
            <Path d="M 106 88 Q 160 54 214 88" stroke={ink} strokeWidth="2.8" fill="none" />
            <Path d="M 106 92 Q 160 120 214 92" stroke={ink} strokeWidth="2" fill="none" />
            <Path d="M 96 52 Q 160 40 228 58" stroke={accent} strokeWidth="2" fill="none" />
            <SvgText x="20" y="54" fill={accent} fontSize="10">Brow Ridge</SvgText>
            <SvgText x="20" y="96" fill={ink} fontSize="10">Wrapped Lids</SvgText>
          </G>
        );

      case 'nose_mouth_planes':
        return (
          <G>
            {/* 4-plane wedge nose */}
            <Polygon points="84,42 100,42 108,108 76,108" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Polygon points="76,108 108,108 92,126" fill={muted} fillOpacity="0.6" stroke={ink} strokeWidth="1.8" />
            <Line x1="84" y1="42" x2="64" y2="112" stroke={ink} strokeWidth="1.4" />
            <Line x1="100" y1="42" x2="120" y2="112" stroke={ink} strokeWidth="1.4" />
            <SvgText x="54" y="148" fill={ink} fontSize="10">4-Plane Wedge</SvgText>
            {/* Mouth cylinder */}
            <Ellipse cx="228" cy="94" rx="46" ry="34" fill={fill} stroke={ink} strokeWidth="1.5" />
            <Path d="M 192 92 Q 228 102 264 92" stroke={accent} strokeWidth="2.4" fill="none" />
            <Path d="M 204 82 Q 228 88 252 82" stroke={ink} strokeWidth="1.6" fill="none" />
            <Path d="M 206 106 Q 228 114 250 106" stroke={ink} strokeWidth="1.6" fill="none" />
            <SvgText x="184" y="148" fill={ink} fontSize="10">Curved Dental Barrel</SvgText>
          </G>
        );

      case 'lighting_setups':
      case 'portrait_values':
        return (
          <G>
            {[
              { x: 64, label: 'Rembrandt 45°', split: 0.62 },
              { x: 160, label: 'Split 90°', split: 0.5 },
              { x: 256, label: 'Rim / Back', split: 0.15 },
            ].map((item, idx) => (
              <G key={idx}>
                <Circle cx={item.x} cy="80" r="34" fill={idx === 2 ? '#2D2B28' : fill} stroke={ink} strokeWidth="1.8" />
                {idx === 0 && (
                  <Path d={`M ${item.x + 2} 46 A 34 34 0 0 1 ${item.x + 2} 114 L ${item.x + 12} 92 Z`} fill="#3A3834" />
                )}
                {idx === 1 && (
                  <Path d={`M ${item.x} 46 A 34 34 0 0 1 ${item.x} 114 Z`} fill="#2C2A27" />
                )}
                {idx === 2 && (
                  <Path d={`M ${item.x - 32} 66 A 34 34 0 0 1 ${item.x - 16} 50`} stroke="#FFFFFF" strokeWidth="3.2" fill="none" />
                )}
                <SvgText x={item.x - 36} y="140" fill={ink} fontSize="10">{item.label}</SvgText>
              </G>
            ))}
          </G>
        );

      case 'expression_squash_stretch':
        return (
          <G>
            {/* Squashed / Joy vs Stretched / Surprise */}
            <Ellipse cx="96" cy="86" rx="38" ry="44" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Path d="M 74 72 Q 82 64 90 72" stroke={ink} strokeWidth="2" fill="none" />
            <Path d="M 102 72 Q 110 64 118 72" stroke={ink} strokeWidth="2" fill="none" />
            <Path d="M 74 96 Q 96 116 118 96" stroke={accent} strokeWidth="2.4" fill="none" />
            <SvgText x="62" y="150" fill={ink} fontSize="10">Squash (Cheeks Up)</SvgText>

            <Ellipse cx="224" cy="88" rx="34" ry="52" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Path d="M 204 58 Q 212 48 220 58" stroke={ink} strokeWidth="2" fill="none" />
            <Path d="M 228 58 Q 236 48 244 58" stroke={ink} strokeWidth="2" fill="none" />
            <Ellipse cx="224" cy="112" rx="10" ry="15" stroke={accent} strokeWidth="2.2" fill="none" />
            <SvgText x="184" y="156" fill={ink} fontSize="10">Stretch (Jaw Drop)</SvgText>
          </G>
        );

      case 'gesture_line_of_action':
        return (
          <G>
            <Path d="M 135 28 C 205 64 105 112 185 162" stroke={accent} strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <Circle cx="136" cy="34" r="14" stroke={ink} strokeWidth="1.8" fill={fill} />
            <Line x1="115" y1="62" x2="188" y2="54" stroke={ink} strokeWidth="2.4" />
            <Line x1="118" y1="108" x2="176" y2="118" stroke={ink} strokeWidth="2.4" />
            <SvgText x="200" y="58" fill={ink} fontSize="10">Shoulder Tilt</SvgText>
            <SvgText x="190" y="122" fill={ink} fontSize="10">Opposing Hip Tilt</SvgText>
            <SvgText x="24" y="92" fill={accent} fontSize="11" fontWeight="600">S-Curve Action</SvgText>
          </G>
        );

      case 'torso_bean':
        return (
          <G>
            <Ellipse cx="152" cy="64" rx="36" ry="38" transform="rotate(-14 152 64)" fill={fill} stroke={ink} strokeWidth="2" />
            <Ellipse cx="164" cy="124" rx="34" ry="24" transform="rotate(14 164 124)" fill={fill} stroke={ink} strokeWidth="2" />
            <Path d="M 152 30 Q 146 92 164 146" stroke={accent} strokeWidth="1.8" strokeDasharray="4 3" fill="none" />
            <SvgText x="206" y="64" fill={ink} fontSize="10">Ribcage Egg</SvgText>
            <SvgText x="206" y="100" fill={accent} fontSize="10">Pinch / Stretch</SvgText>
            <SvgText x="206" y="130" fill={ink} fontSize="10">Pelvis Block</SvgText>
          </G>
        );

      case 'figure_8_heads':
        return (
          <G>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const y = 16 + i * 18;
              return (
                <G key={i}>
                  <Line x1="70" y1={y} x2="250" y2={y} stroke={i === 4 ? accent : muted} strokeWidth={i === 4 ? 1.5 : 0.9} />
                  {i < 8 && (
                    <SvgText x="46" y={y + 12} fill={muted} fontSize="9">{i + 1}</SvgText>
                  )}
                </G>
              );
            })}
            <Line x1="160" y1="16" x2="160" y2="160" stroke={accent} strokeWidth="1.3" strokeDasharray="3 3" />
            <Ellipse cx="160" cy="25" rx="8" ry="9" stroke={ink} strokeWidth="1.8" fill={fill} />
            <Rect x="144" y="38" width="32" height="48" rx="8" stroke={ink} strokeWidth="1.8" fill={fill} />
            <Line x1="150" y1="86" x2="146" y2="160" stroke={ink} strokeWidth="2.2" />
            <Line x1="170" y1="86" x2="174" y2="160" stroke={ink} strokeWidth="2.2" />
            <SvgText x="195" y="86" fill={accent} fontSize="9">4H: Hip / Midpoint</SvgText>
            <SvgText x="195" y="124" fill={muted} fontSize="9">6H: Knees</SvgText>
          </G>
        );

      case 'foreshortening_overlap':
        return (
          <G>
            <Circle cx="82" cy="88" r="24" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Circle cx="122" cy="92" r="30" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Circle cx="172" cy="96" r="36" fill={fill} stroke={ink} strokeWidth="2" />
            <Circle cx="228" cy="100" r="42" fill={fill} stroke={accent} strokeWidth="2.4" />
            <SvgText x="46" y="42" fill={ink} fontSize="11">Stacked Overlapping Volumes → Closer = Larger</SvgText>
          </G>
        );

      case 'arm_leg_cylinders':
        return (
          <G>
            <Path d="M 88 30 C 78 65 82 95 96 155" stroke={ink} strokeWidth="2.2" fill="none" />
            <Path d="M 118 30 C 138 65 114 95 112 155" stroke={accent} strokeWidth="2.2" fill="none" />
            <Ellipse cx="103" cy="30" rx="15" ry="5" stroke={ink} strokeWidth="1.4" fill="none" />
            <Ellipse cx="104" cy="94" rx="14" ry="5" stroke={ink} strokeWidth="1.4" fill="none" />
            <SvgText x="150" y="70" fill={ink} fontSize="10">Curved Muscle</SvgText>
            <SvgText x="150" y="120" fill={accent} fontSize="10">vs. Straight Bone</SvgText>
          </G>
        );

      case 'hand_block_construction':
        return (
          <G>
            <Polygon points="116,144 196,144 202,90 120,84" fill={fill} stroke={ink} strokeWidth="2" />
            <Path d="M 118 82 Q 160 66 204 88" stroke={accent} strokeWidth="2" fill="none" />
            <Rect x="122" y="40" width="14" height="42" rx="6" fill={fill} stroke={ink} strokeWidth="1.6" />
            <Rect x="142" y="28" width="15" height="52" rx="6" fill={fill} stroke={ink} strokeWidth="1.6" />
            <Rect x="164" y="34" width="14" height="48" rx="6" fill={fill} stroke={ink} strokeWidth="1.6" />
            <Rect x="184" y="48" width="13" height="38" rx="6" fill={fill} stroke={ink} strokeWidth="1.6" />
            <Polygon points="116,128 84,96 96,86 120,110" fill={fill} stroke={ink} strokeWidth="1.8" />
          </G>
        );

      case 'foot_wedge_planes':
        return (
          <G>
            <Rect x="82" y="36" width="44" height="72" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Polygon points="82,108 126,108 238,140 238,152 80,152" fill={fill} stroke={ink} strokeWidth="2" />
            <Path d="M 110 152 Q 146 138 182 152" stroke={accent} strokeWidth="2" fill="none" />
            <SvgText x="148" y="88" fill={ink} fontSize="10">Ankle Cylinder + Wedge</SvgText>
          </G>
        );

      case 'horizon_rule_of_thirds':
        return (
          <G>
            <Rect x="40" y="26" width="240" height="128" fill={fill} fillOpacity="0.35" stroke={ink} strokeWidth="1.8" />
            <Line x1="120" y1="26" x2="120" y2="154" stroke={muted} strokeWidth="1" strokeDasharray="4 3" />
            <Line x1="200" y1="26" x2="200" y2="154" stroke={muted} strokeWidth="1" strokeDasharray="4 3" />
            <Line x1="40" y1="68" x2="280" y2="68" stroke={muted} strokeWidth="1" strokeDasharray="4 3" />
            <Line x1="40" y1="111" x2="280" y2="111" stroke={accent} strokeWidth="1.8" />
            <Circle cx="120" cy="111" r="6" fill={accent} />
            <SvgText x="132" y="104" fill={accent} fontSize="10">Focal Point (1/3)</SvgText>
          </G>
        );

      case 'atmospheric_depth':
        return (
          <G>
            <Path d="M 24 88 L 96 52 L 176 78 L 246 46 L 296 84 L 296 160 L 24 160 Z" fill={muted} fillOpacity="0.25" />
            <Path d="M 24 114 L 112 80 L 198 106 L 296 76 L 296 160 L 24 160 Z" fill={muted} fillOpacity="0.52" />
            <Path d="M 24 138 L 136 112 L 222 134 L 296 112 L 296 160 L 24 160 Z" fill={ink} fillOpacity="0.82" />
            <SvgText x="32" y="42" fill={muted} fontSize="10">Background: Light / Soft</SvgText>
            <SvgText x="32" y="152" fill="#FFFFFF" fontSize="10">Foreground: Dark / Crisp</SvgText>
          </G>
        );

      case 'cloud_value_forms':
        return (
          <G>
            <Circle cx="116" cy="96" r="28" fill={fill} stroke={ink} strokeWidth="1.5" />
            <Circle cx="158" cy="78" r="36" fill={fill} stroke={ink} strokeWidth="1.5" />
            <Circle cx="204" cy="94" r="30" fill={fill} stroke={ink} strokeWidth="1.5" />
            <Line x1="78" y1="118" x2="244" y2="118" stroke={accent} strokeWidth="2.4" />
            <SvgText x="108" y="140" fill={accent} fontSize="10">Flat Perspective Cloud Base</SvgText>
          </G>
        );

      case 'foliage_massing':
        return (
          <G>
            <Line x1="160" y1="158" x2="160" y2="96" stroke={ink} strokeWidth="8" />
            <Circle cx="132" cy="84" r="34" fill={fill} stroke={ink} strokeWidth="1.8" />
            <Circle cx="184" cy="88" r="32" fill={muted} fillOpacity="0.55" stroke={ink} strokeWidth="1.8" />
            <Circle cx="158" cy="56" r="36" fill={fill} stroke={ink} strokeWidth="1.8" />
            <SvgText x="24" y="48" fill={ink} fontSize="10">3–5 Major Canopy Spheres</SvgText>
          </G>
        );

      case 'water_reflections':
        return (
          <G>
            <Polygon points="76,92 136,34 196,92" fill={ink} fillOpacity="0.7" />
            <Line x1="26" y1="92" x2="294" y2="92" stroke={accent} strokeWidth="1.6" />
            <Polygon points="76,92 136,150 196,92" fill={muted} fillOpacity="0.45" />
            <Line x1="60" y1="110" x2="220" y2="110" stroke="#FFFFFF" strokeWidth="2" />
            <Line x1="90" y1="126" x2="195" y2="126" stroke="#FFFFFF" strokeWidth="2" />
            <SvgText x="206" y="84" fill={accent} fontSize="10">Mirror + Ripples</SvgText>
          </G>
        );

      case 'notan_value_shapes':
        return (
          <G>
            <Rect x="44" y="28" width="232" height="124" fill="#FFFFFF" stroke={ink} strokeWidth="1.8" />
            <Polygon points="44,28 124,28 124,110 218,152 44,152" fill="#1F1E1C" />
            <Polygon points="210,48 276,48 276,152 246,152" fill="#1F1E1C" />
            <SvgText x="134" y="82" fill="#1F1E1C" fontSize="11" fontWeight="700">2-VALUE NOTAN</SvgText>
          </G>
        );

      case 'rock_planar_fractures':
        return (
          <G>
            <Polygon points="76,144 96,52 178,44 238,94 226,144" fill={fill} stroke={ink} strokeWidth="2" />
            <Polygon points="178,44 238,94 226,144 166,144" fill={muted} fillOpacity="0.65" stroke={ink} strokeWidth="1.8" />
            <Line x1="88" y1="88" x2="174" y2="78" stroke={accent} strokeWidth="1.5" />
            <Line x1="82" y1="118" x2="170" y2="110" stroke={accent} strokeWidth="1.5" />
            <SvgText x="24" y="34" fill={ink} fontSize="10">Top Light vs. Vertical Shadow Planes</SvgText>
          </G>
        );

      case 'capstone_composition':
      case 'capstone_lighting_narrative':
      default:
        return (
          <G>
            <Rect x="40" y="24" width="240" height="132" fill={fill} fillOpacity="0.3" stroke={ink} strokeWidth="1.8" />
            <Path d="M 40 120 Q 120 90 190 112 L 280 96 L 280 156 L 40 156 Z" fill={muted} fillOpacity="0.4" />
            <Polygon points="40,110 118,128 118,156 40,156" fill={ink} fillOpacity="0.85" />
            <Circle cx="102" cy="96" r="7" fill={accent} />
            <Line x1="102" y1="103" x2="102" y2="128" stroke={accent} strokeWidth="3.5" />
            <Circle cx="212" cy="64" r="18" fill="#FFFFFF" stroke={accent} strokeWidth="1.5" />
            <SvgText x="134" y="48" fill={ink} fontSize="10">Focal Light + Foreground Scale</SvgText>
          </G>
        );
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}>
      <Svg width="100%" height="100%" viewBox="0 0 320 176" preserveAspectRatio="xMidYMid meet">
        {renderGraphic()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
  },
});
