'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PersonalityVector, PERSONALITY_QUESTIONS } from '@/types';

interface RadarChartProps {
  data: PersonalityVector;
}

export default function RadarChart({ data }: RadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const isMobile = containerWidth < 400;
        const size = isMobile ? Math.min(containerWidth - 32, 350) : 400;
        setDimensions({ width: size, height: size });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const isMobile = width < 400;
    const margin = isMobile ? 35 : 50;
    const radius = Math.min(width, height) / 2 - margin;
    const labelFontSize = isMobile ? '10px' : '12px';
    const levelFontSize = isMobile ? '8px' : '10px';
    const labelOffset = isMobile ? 1.25 : 1.15;

    const chartDimensions = Object.keys(PERSONALITY_QUESTIONS) as Array<keyof PersonalityVector>;
    const angleSlice = (Math.PI * 2) / chartDimensions.length;

    const radarScale = d3.scaleLinear().domain([0, 10]).range([0, radius]);

    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    const levels = 5;
    for (let i = 0; i < levels; i++) {
      const levelFactor = radius * ((i + 1) / levels);
      const levelData = chartDimensions.map((_, j) => ({
        x: levelFactor * Math.cos(angleSlice * j - Math.PI / 2),
        y: levelFactor * Math.sin(angleSlice * j - Math.PI / 2),
      }));

      g.append('polygon')
        .datum(levelData)
        .attr('points', (d: any) => d.map((p: any) => `${p.x},${p.y}`).join(' '))
        .attr('fill', 'none')
        .attr('stroke', '#d4d4d8')
        .attr('stroke-width', 1);

      g.append('text')
        .attr('x', 0)
        .attr('y', -levelFactor + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', levelFontSize)
        .text((i + 1) * 2);
    }

    const axisLines = chartDimensions.map((d, i) => ({
      x: radius * Math.cos(angleSlice * i - Math.PI / 2),
      y: radius * Math.sin(angleSlice * i - Math.PI / 2),
      label: d,
    }));

    g.selectAll('.axis-line')
      .data(axisLines)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d: any) => d.x)
      .attr('y2', (d: any) => d.y)
      .attr('stroke', '#d4d4d8')
      .attr('stroke-width', 1);

    g.selectAll('.axis-label')
      .data(axisLines)
      .enter()
      .append('text')
      .attr('x', (d: any) => d.x * labelOffset)
      .attr('y', (d: any) => d.y * labelOffset)
      .attr('text-anchor', (d: any) => (d.x > 0 ? 'start' : d.x < 0 ? 'end' : 'middle'))
      .attr('dominant-baseline', (d: any) => (d.y > 0 ? 'hanging' : d.y < 0 ? 'auto' : 'middle'))
      .attr('fill', '#ffffff')
      .attr('font-size', labelFontSize)
      .attr('font-weight', '500')
      .text((d: any) => d.label);

    const polygonData = chartDimensions.map((d, i) => ({
      x: radarScale(data[d]) * Math.cos(angleSlice * i - Math.PI / 2),
      y: radarScale(data[d]) * Math.sin(angleSlice * i - Math.PI / 2),
    }));

    g.append('polygon')
      .datum(polygonData)
      .attr('points', (d: any) => d.map((p: any) => `${p.x},${p.y}`).join(' '))
      .attr('fill', 'rgba(59, 130, 246, 0.2)')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2);

    g.selectAll('.data-point')
      .data(polygonData)
      .enter()
      .append('circle')
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y)
      .attr('r', isMobile ? 3 : 4)
      .attr('fill', '#3b82f6');
  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="flex justify-center w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-lg"
      />
    </div>
  );
}
