import { useEffect, useState } from 'react';

// Animated Progress Ring
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
  animated?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#6366f1',
  bgColor = '#e5e7eb',
  label,
  sublabel,
  animated = true,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animated]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animated ? 'stroke-dashoffset 1s ease-out' : 'none',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        {label && <span className="text-2xl font-bold text-gray-900">{label}</span>}
        {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
      </div>
    </div>
  );
}

// Mini Bar Chart
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showLabels?: boolean;
  animated?: boolean;
}

export function MiniBarChart({
  data,
  height = 60,
  showLabels = true,
  animated = true,
}: BarChartProps) {
  const [animatedData, setAnimatedData] = useState(data.map((d) => ({ ...d, value: 0 })));
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedData(data);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedData(data);
    }
  }, [data, animated]);

  const defaultColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {animatedData.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          const color = item.color || defaultColors[index % defaultColors.length];
          return (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md transition-all duration-700 ease-out"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  minHeight: item.value > 0 ? '4px' : '0',
                }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex gap-2 mt-2">
          {data.map((item) => (
            <div key={item.label} className="flex-1 text-center">
              <p className="text-xs text-gray-500 truncate">{item.label}</p>
              <p className="text-sm font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sparkline Chart
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  animated?: boolean;
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  color = '#6366f1',
  fillColor,
  animated = true,
}: SparklineProps) {
  const [isVisible, setIsVisible] = useState(!animated);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [animated]);

  if (data.length < 2) return null;

  const padding = 2;
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (value - minValue) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M${points.join(' L')}`;
  const areaD = `${pathD} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {fillColor && (
        <path
          d={areaD}
          fill={fillColor}
          opacity={isVisible ? 0.2 : 0}
          style={{ transition: 'opacity 0.5s ease-out' }}
        />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isVisible ? 'none' : '1000'}
        strokeDashoffset={isVisible ? 0 : 1000}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      {/* End dot */}
      <circle
        cx={width - padding}
        cy={padding + (1 - (data[data.length - 1] - minValue) / range) * (height - padding * 2)}
        r={3}
        fill={color}
        opacity={isVisible ? 1 : 0}
        style={{ transition: 'opacity 0.5s ease-out 0.8s' }}
      />
    </svg>
  );
}

// Animated Counter
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}

// Donut Chart
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  data,
  size = 120,
  strokeWidth = 20,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const [animatedData, setAnimatedData] = useState(data.map((d) => ({ ...d, value: 0 })));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const total = data.reduce((sum, item) => sum + item.value, 1);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedData(data), 100);
    return () => clearTimeout(timer);
  }, [data]);

  let currentOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {animatedData.map((item, index) => {
          const segmentLength = (item.value / total) * circumference;
          const offset = currentOffset;
          currentOffset += segmentLength;

          return (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-offset}
              style={{
                transition: 'stroke-dasharray 1s ease-out, stroke-dashoffset 1s ease-out',
                transitionDelay: `${index * 0.1}s`,
              }}
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        {centerValue && <span className="text-xl font-bold text-gray-900">{centerValue}</span>}
        {centerLabel && <span className="text-xs text-gray-500">{centerLabel}</span>}
      </div>
    </div>
  );
}

// Stat Card with Trend
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  iconBg?: string;
  sparklineData?: number[];
}

export function StatCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  iconBg = 'bg-primary-100',
  sparklineData,
}: StatCardProps) {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          {icon}
        </div>
        {sparklineData && (
          <Sparkline
            data={sparklineData}
            width={60}
            height={24}
            color={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6366f1'}
            fillColor={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6366f1'}
          />
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500">{title}</p>
        <div className="flex items-end gap-2 mt-1">
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
          </p>
          {change !== undefined && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${trendColors[trend]}`}>
              {trendIcons[trend]} {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
