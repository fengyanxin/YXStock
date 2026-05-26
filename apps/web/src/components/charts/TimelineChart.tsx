import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { TimelinePoint } from '@/api';

export function TimelineChart({ data, height = 280 }: { data: TimelinePoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    if (!chartRef.current) chartRef.current = echarts.init(ref.current);
    const chart = chartRef.current;
    const times = data.map((d) => d.time ?? '');
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: times, boundaryGap: false },
      yAxis: { scale: true, splitLine: { lineStyle: { color: '#21262d' } } },
      series: [
        {
          name: '均价',
          type: 'line',
          data: data.map((d) => d.avgPrice ?? null),
          showSymbol: false,
          lineStyle: { color: '#f0883e', width: 1 },
        },
        {
          name: '价格',
          type: 'line',
          data: data.map((d) => d.price ?? null),
          showSymbol: false,
          lineStyle: { color: '#58a6ff', width: 1.5 },
          areaStyle: { color: 'rgba(88,166,255,0.08)' },
        },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data]);

  useEffect(() => () => chartRef.current?.dispose(), []);

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-[var(--color-muted)]">暂无分时数据</p>;
  }

  return <div ref={ref} style={{ height }} className="w-full" />;
}
