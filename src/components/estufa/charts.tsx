import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type SparklineProps = {
  data: number[];
  color: string;
  width?: number;
  height?: number;
};

export function Sparkline({ data, color, width = 56, height = 22 }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * stepX;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const d = `M ${points.join(' L ')}`;

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type LineChartProps = {
  data: number[];
  color?: string;
  height?: number;
  labels?: string[];
};

export function LineChart({
  data,
  color = '#4ADE80',
  height = 180,
  labels = ['00:00', '06:00', '12:00', '18:00', '24:00'],
}: LineChartProps) {
  const width = 320;
  const paddingX = 8;
  const paddingY = 16;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2 - 20;

  if (data.length === 0) return null;

  // Uma única leitura: desenha ponto central (comum no filtro 1h com sync horário).
  const series = data.length === 1 ? [data[0], data[0]] : data;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = chartW / (series.length - 1);

  const coords = series.map((value, index) => {
    const x = paddingX + index * stepX;
    const y = paddingY + (chartH - ((value - min) / range) * chartH);
    return { x, y };
  });

  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${paddingY + chartH} L ${coords[0].x} ${paddingY + chartH} Z`;
  const last = coords[coords.length - 1];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#chartFill)" />
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={5} fill={color} />
      <Circle cx={last.x} cy={last.y} r={9} fill={color} opacity={0.25} />
      {labels.map((label, index) => {
        const x = paddingX + (index / Math.max(labels.length - 1, 1)) * chartW;
        return (
          <Path
            key={`${label}-${index}`}
            d={`M ${x} ${height - 4}`}
            stroke="transparent"
          />
        );
      })}
    </Svg>
  );
}

export const CHART_TIME_LABELS = ['00:00', '06:00', '12:00', '18:00', '24:00'];
