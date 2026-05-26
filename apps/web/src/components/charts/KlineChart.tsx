import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { KlineBar } from '@/api';
import type { IndicatorKey } from '@/stores/uiStore';

interface KlineChartProps {
  data: KlineBar[];
  indicators: IndicatorKey[];
  height?: number;
  period?: 'daily' | 'weekly' | 'monthly';
}

/** 默认可见 K 线根数：日 K 偏放大以便看清蜡烛细节 */
const DEFAULT_VISIBLE_BARS: Record<'daily' | 'weekly' | 'monthly', number> = {
  daily: 50,
  weekly: 52,
  monthly: 36,
};

function calcZoomRange(total: number, visibleBars: number) {
  if (total <= 0) return { start: 0, end: 100 };
  if (total <= visibleBars) return { start: 0, end: 100 };
  const start = ((total - visibleBars) / total) * 100;
  return { start: Math.max(0, start), end: 100 };
}

export function KlineChart({
  data,
  indicators,
  height = 480,
  period = 'daily',
}: KlineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    }
    const chart = chartRef.current;

    const dates = data.map((d) => d.date ?? d.time ?? '');
    const zoom = calcZoomRange(dates.length, DEFAULT_VISIBLE_BARS[period]);
    const ohlc = data.map((d) => [d.open, d.close, d.low, d.high]);
    const volumes = data.map((d, i) => [
      i,
      d.volume ?? 0,
      (d.close ?? 0) >= (d.open ?? 0) ? 1 : -1,
    ]);

    const grids: echarts.GridComponentOption[] = [
      { left: 56, right: 16, top: 24, height: '48%' },
      { left: 56, right: 16, top: '58%', height: '12%' },
    ];
    const xAxes: echarts.XAXisComponentOption[] = [
      { type: 'category', data: dates, gridIndex: 0, axisLine: { lineStyle: { color: '#30363d' } } },
      { type: 'category', data: dates, gridIndex: 1, show: false },
    ];
    const yAxes: echarts.YAXisComponentOption[] = [
      { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#21262d' } } },
      { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false } },
    ];
    const series: echarts.SeriesOption[] = [
      {
        name: 'K',
        type: 'candlestick',
        data: ohlc,
        xAxisIndex: 0,
        yAxisIndex: 0,
        barMaxWidth: period === 'daily' ? 14 : period === 'weekly' ? 10 : 8,
        barMinWidth: 3,
        itemStyle: {
          color: '#f85149',
          color0: '#3fb950',
          borderColor: '#f85149',
          borderColor0: '#3fb950',
        },
      },
      {
        name: '量',
        type: 'bar',
        data: volumes,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: (p) => {
            const d = p.data as number[];
            return d[2] === 1 ? '#f8514966' : '#3fb95066';
          },
        },
      },
    ];

    let gridIdx = 2;
    const addSub = (top: string, h: string) => {
      grids.push({ left: 56, right: 16, top, height: h });
      xAxes.push({ type: 'category', data: dates, gridIndex: gridIdx, show: false });
      yAxes.push({ scale: true, gridIndex: gridIdx, splitNumber: 2 });
      return gridIdx++;
    };

    if (indicators.includes('ma')) {
      const ma5 = data.map((d) => d.ma?.ma5 ?? d.ma?.['5'] ?? null);
      const ma10 = data.map((d) => d.ma?.ma10 ?? d.ma?.['10'] ?? null);
      const ma20 = data.map((d) => d.ma?.ma20 ?? d.ma?.['20'] ?? null);
      [ma5, ma10, ma20].forEach((line, i) => {
        series.push({
          name: `MA${[5, 10, 20][i]}`,
          type: 'line',
          data: line,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1 },
          xAxisIndex: 0,
          yAxisIndex: 0,
        });
      });
    }

    if (indicators.includes('macd')) {
      const gi = addSub('74%', '10%');
      series.push(
        {
          name: 'DIF',
          type: 'line',
          data: data.map((d) => d.macd?.dif ?? null),
          showSymbol: false,
          xAxisIndex: gi,
          yAxisIndex: gi,
          lineStyle: { width: 1, color: '#58a6ff' },
        },
        {
          name: 'DEA',
          type: 'line',
          data: data.map((d) => d.macd?.dea ?? null),
          showSymbol: false,
          xAxisIndex: gi,
          yAxisIndex: gi,
          lineStyle: { width: 1, color: '#f0883e' },
        },
        {
          name: 'MACD',
          type: 'bar',
          data: data.map((d) => d.macd?.macd ?? null),
          xAxisIndex: gi,
          yAxisIndex: gi,
          itemStyle: { color: '#8b949e' },
        },
      );
    }

    if (indicators.includes('kdj')) {
      const gi = indicators.includes('macd') ? addSub('86%', '8%') : addSub('74%', '10%');
      series.push(
        {
          name: 'K',
          type: 'line',
          data: data.map((d) => d.kdj?.k ?? null),
          showSymbol: false,
          xAxisIndex: gi,
          yAxisIndex: gi,
        },
        {
          name: 'D',
          type: 'line',
          data: data.map((d) => d.kdj?.d ?? null),
          showSymbol: false,
          xAxisIndex: gi,
          yAxisIndex: gi,
        },
        {
          name: 'J',
          type: 'line',
          data: data.map((d) => d.kdj?.j ?? null),
          showSymbol: false,
          xAxisIndex: gi,
          yAxisIndex: gi,
        },
      );
    }

    if (indicators.includes('rsi')) {
      const gi = addSub(indicators.length > 2 ? '92%' : '86%', '6%');
      series.push({
        name: 'RSI6',
        type: 'line',
        data: data.map((d) => d.rsi?.rsi6 ?? d.rsi?.['6'] ?? null),
        showSymbol: false,
        xAxisIndex: gi,
        yAxisIndex: gi,
      });
    }

    chart.setOption(
      {
        backgroundColor: 'transparent',
        animation: false,
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: xAxes.map((_, i) => i),
            start: zoom.start,
            end: zoom.end,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
          },
          {
            type: 'slider',
            xAxisIndex: xAxes.map((_, i) => i),
            bottom: 4,
            height: 18,
            start: zoom.start,
            end: zoom.end,
            showDetail: true,
          },
        ],
        grid: grids,
        xAxis: xAxes,
        yAxis: yAxes,
        series,
      },
      true,
    );

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data, indicators, period]);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-[var(--color-muted)]">暂无 K 线数据</p>;
  }

  return <div ref={ref} style={{ height }} className="w-full" />;
}
