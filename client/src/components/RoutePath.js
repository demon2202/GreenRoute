// RoutePath - Renders a GPS route as a vector SVG path on activity cards
import React, { useMemo, useRef } from 'react';

/**
 * RoutePath - Renders a GPS route as a vector SVG path on activity cards
 * 
 * Props:
 * - coordinates: Array of [lng, lat] pairs representing the route
 * - width: Card width in pixels
 * - height: Card height in pixels
 * - padding: Padding around the route in pixels
 * - strokeColor: Color of the route line
 * - strokeWidth: Width of the route line
 * - startMarker: Whether to show START marker
 * - endMarker: Whether to show END marker
 * - fit: Fit strategy - 'bounds', 'width', 'height', or 'auto'
 */
const RoutePath = ({
  coordinates,
  width,
  height,
  padding = 20,
  strokeColor = '#4A7C59',
  strokeWidth = 6,
  startMarker = true,
  endMarker = true,
  fit = 'bounds',
}) => {
  // No coordinates to render
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  // Calculate bounds and scale factor using useMemo
  const { scale, offsetLng, offsetLat } = useMemo(() => {
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    coordinates.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    const lngRange = Math.max(maxLng - minLng, 1);
    const latRange = Math.max(maxLat - minLat, 1);

    // Add 10% padding to bounds
    const paddedMinLng = minLng - lngRange * 0.1;
    const paddedMaxLng = maxLng + lngRange * 0.1;
    const paddedMinLat = minLat - latRange * 0.1;
    const paddedMaxLat = maxLat + latRange * 0.1;

    // Calculate card dimensions
    const cardWidth = width - 2 * padding;
    const cardHeight = height - 2 * padding;

    // Calculate scale based on fit strategy
    let scale;
    if (fit === 'width') {
      scale = cardWidth / lngRange;
    } else if (fit === 'height') {
      // Mercator-style: account for latitude cos factor
      const latFactor = Math.abs(maxLat - minLat) * Math.PI / 180;
      const lngFactor = Math.abs(maxLng - minLng) * Math.PI / 180;
      const effectiveHeight = cardHeight * Math.cos(minLat * Math.PI / 180);
      scale = Math.min(cardWidth / lngRange, effectiveHeight / latRange);
    } else if (fit === 'height-strict') {
      scale = cardHeight / latRange;
    } else { // 'bounds' default - fit to bounds maintaining aspect ratio
      scale = Math.min(cardWidth / lngRange, cardHeight / latRange);
    }

    // Compute offsets
    const offsetLng = -(paddedMinLng) / scale + padding;
    const offsetLat = -(paddedMinLat) / scale + padding;

    return { scale, offsetLng, offsetLat };
  }, [coordinates, width, height, padding, fit]);

  // Project all coordinates to screen space
  const projectedPoints = useMemo(() => {
    const cardWidth = width - 2 * padding;
    const cardHeight = height - 2 * padding;

    return coordinates.map(([lng, lat]) => {
      const x = (lng / scale) + offsetLng;
      // Mercator y projection: y = ln(tan(π/4 + lat/2))
      const yMercator = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
      // Invert y and add offset, with rough vertical centering
      const y = (-yMercator / scale) + offsetLat + padding;
      return { x, y };
    });
  }, [coordinates, scale, offsetLng, offsetLat, width, height, padding]);

  // If we don't have enough points after projection, show nothing
  if (projectedPoints.length < 2) {
    return null;
  }

  // Clip points to card bounds
  const clippedPoints = projectedPoints.filter(
    (p) => p.x >= padding && p.x <= width - padding && p.y >= padding && p.y <= height - padding
  );

  // Need at least 2 points after clipping to draw a line
  if (clippedPoints.length < 2) {
    return null;
  }

  // Build the SVG path using a smooth curve (Catmull-Rom spline approximation)
  const pathRef = useRef(null);

  const generatePath = () => {
    if (!pathRef.current) return 'M 0 0';
    const points = clippedPoints;
    if (points.length < 2) return 'M 0 0';

    let d = `M ${points[0].x} ${points[0].y}`;

    // Catmull-Rom spline for smooth curve
    // Add control points between each pair of points
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i > 0 ? i - 1 : 0];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 1 < points.length ? i + 2 : i + 1];

      // Control points for smooth curve
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }

    return d;
  };

  return (
    <svg
      ref={pathRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <path
        d={generatePath()}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {startMarker && clippedPoints.length > 0 && (
        <g>
          <circle
            cx={clippedPoints[0].x}
            cy={clippedPoints[0].y}
            r={8}
            fill={strokeColor}
          />
          <circle
            cx={clippedPoints[0].x}
            cy={clippedPoints[0].y}
            r={6}
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          <text
            x={clippedPoints[0].x}
            y={clippedPoints[0].y - 15}
            fill="#FFFFFF"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="bold"
            fontSize="11"
            textAnchor="middle"
          >
            START
          </text>
        </g>
      )}

      {endMarker && clippedPoints.length > 0 && (
        <g>
          <circle
            cx={clippedPoints[clippedPoints.length - 1].x}
            cy={clippedPoints[clippedPoints.length - 1].y}
            r={8}
            fill={strokeColor}
          />
          <circle
            cx={clippedPoints[clippedPoints.length - 1].x}
            cy={clippedPoints[clippedPoints.length - 1].y}
            r={6}
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          <text
            x={clippedPoints[clippedPoints.length - 1].x}
            y={clippedPoints[clippedPoints.length - 1].y + 15}
            fill="#FFFFFF"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="bold"
            fontSize="11"
            textAnchor="middle"
          >
            END
          </text>
        </g>
      )}
    </svg>
  );
};

/* eslint-disable react/prop-types */
RoutePath.propTypes = {
  coordinates: React.array.isRequired,
  width: React.number.isRequired,
  height: React.number.isRequired,
  padding: React.number,
  strokeColor: React.string,
  strokeWidth: React.number,
  startMarker: React.bool,
  endMarker: React.bool,
  fit: React.string,
};
RoutePath.defaultProps = {
  padding: 20,
  strokeColor: '#4A7C59',
  strokeWidth: 6,
  startMarker: true,
  endMarker: true,
  fit: 'bounds',
};

/* eslint-enable react/prop-types */

export default RoutePath;
