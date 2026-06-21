import React from 'react';
import Svg, { Path, Rect, Line, Circle, Polygon } from 'react-native-svg';

// Simple white line-art icons for each sweatshirt category.
// Drawn on a 24x24 grid; stroke-based so they stay crisp at any size.

export type CategoryType =
  | 'hoodie' | 'crew' | 'zip' | 'crop' | 'mock' | 'vintage' | 'university';

// A crew-neck sweatshirt body — the base shape most icons build on.
const BODY =
  'M8.5 4.5 L6 4.5 L2.5 8 L5 10.5 L6.5 9 L6.5 19.5 L17.5 19.5 L17.5 9 ' +
  'L19 10.5 L21.5 8 L18 4.5 L15.5 4.5 C14.5 6.5 9.5 6.5 8.5 4.5 Z';

// A cropped (shorter) body.
const BODY_CROP =
  'M8.5 4.5 L6 4.5 L2.5 8 L5 10.5 L6.5 9 L6.5 15.5 L17.5 15.5 L17.5 9 ' +
  'L19 10.5 L21.5 8 L18 4.5 L15.5 4.5 C14.5 6.5 9.5 6.5 8.5 4.5 Z';

export function CategoryIcon({
  type,
  size = 26,
  color = '#fff',
}: {
  type: CategoryType;
  size?: number;
  color?: string;
}) {
  const stroke = color;
  const common = {
    stroke,
    strokeWidth: 1.4,
    fill: 'none',
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {type === 'crew' && <Path d={BODY} {...common} />}

      {type === 'hoodie' && (
        <>
          <Path d={BODY} {...common} />
          {/* hood */}
          <Path d="M7.5 5 C8 1.3 16 1.3 16.5 5" {...common} />
          {/* kangaroo pocket */}
          <Rect x={9} y={14} width={6} height={3.2} rx={0.8} {...common} />
        </>
      )}

      {type === 'zip' && (
        <>
          <Path d={BODY} {...common} />
          {/* center zip */}
          <Line x1={12} y1={5.4} x2={12} y2={19.5} {...common} />
          <Circle cx={12} cy={7} r={0.7} fill={stroke} stroke="none" />
        </>
      )}

      {type === 'crop' && <Path d={BODY_CROP} {...common} />}

      {type === 'mock' && (
        <>
          <Path d={BODY} {...common} />
          {/* raised mock collar + short zip */}
          <Path d="M9.5 4.8 L9.5 2.4 L14.5 2.4 L14.5 4.8" {...common} />
          <Line x1={12} y1={2.6} x2={12} y2={6} {...common} />
        </>
      )}

      {type === 'vintage' && (
        <>
          <Path d={BODY} {...common} />
          {/* small star badge on the chest */}
          <Polygon
            points="12,9.5 12.8,11.2 14.6,11.4 13.3,12.7 13.6,14.5 12,13.6 10.4,14.5 10.7,12.7 9.4,11.4 11.2,11.2"
            {...common}
            strokeWidth={1}
          />
        </>
      )}

      {type === 'university' && (
        <>
          {/* graduation cap */}
          <Polygon points="12,5 21.5,9 12,13 2.5,9" {...common} />
          <Path d="M6.5 10.5 L6.5 14.5 C6.5 16.2 17.5 16.2 17.5 14.5 L17.5 10.5" {...common} />
          <Line x1={21.5} y1={9} x2={21.5} y2={13} {...common} />
          <Path d="M21.5 13 L20.7 14.3 M21.5 13 L22.3 14.3" {...common} />
        </>
      )}
    </Svg>
  );
}

// Maps the category label used in the Discover screen to an icon type.
export const CATEGORY_TYPE: Record<string, CategoryType> = {
  Hoodies: 'hoodie',
  'Crew Necks': 'crew',
  'Zip-Ups': 'zip',
  'Crop Crews': 'crop',
  'Mock Necks': 'mock',
  Vintage: 'vintage',
  University: 'university',
};
