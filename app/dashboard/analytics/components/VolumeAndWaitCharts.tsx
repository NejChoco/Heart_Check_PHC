"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import AnalyticsMetricCards from "@/components/reusables/analyticsMetricCards";

interface Props {
  dailySummary: any[];
  hourlyPattern: any[];
}

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Adds a trailing N-day moving average alongside the raw daily line —
// same idea as the SMA algorithm already used in forecasting, just
// applied here for visual readability rather than prediction.
function withMovingAverage(data: any[], windowSize: number) {
  return data.map((row, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const windowSlice = data.slice(start, i + 1);
    const avg =
      windowSlice.reduce((sum, r) => sum + (r.total_patients || 0), 0) / windowSlice.length;
    return { ...row, moving_avg: Math.round(avg * 10) / 10 };
  });
}

// One line per queue stage — same stage set and colors implied by the
// Queue Stage Breakdown table, so a person can visually connect "which
// stage" across both views.
const STAGE_LINES: { dataKey: string; name: string; color: string }[] = [
  { dataKey: "avg_wait_registration",    name: "Kiosk → Registration wait",        color: "#f59e0b" },
  { dataKey: "avg_service_registration", name: "Registration duration",            color: "#3b82f6" },
  { dataKey: "avg_wait_consultation",    name: "Registration → Consultation wait", color: "#ef4444" },
  { dataKey: "avg_service_consultation", name: "Consultation duration",            color: "#8b5cf6" },
  { dataKey: "avg_service_carryout",     name: "Carryout duration",                color: "#10b981" },
];

export default function VolumeAndWaitCharts({ dailySummary, hourlyPattern }: Props) {
  const isDark = useIsDarkMode();
  const volumeData = withMovingAverage(dailySummary, 7);

  // Keeps x-axis tick spacing even regardless of how many points are
  // plotted — avoids Recharts clustering ticks unevenly on long ranges.
  const tickInterval = Math.max(0, Math.floor(volumeData.length / 8) - 1);

  const tooltipCursor = { fill: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' };
  const tooltipContentStyle = {
    borderRadius: '8px',
    border: 'none',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#e5e7eb' : '#111827',
  };
  const gridStroke = isDark ? '#374151' : '#e5e7eb';
  const legendTextColor = isDark ? '#9ca3af' : '#6b7280';

  // Only plot stages that actually have at least one non-zero value in
  // this range — an all-zero line (e.g. carryout never selected upstream)
  // just adds legend noise without conveying anything.
  const activeStageLines = STAGE_LINES.filter((stage) =>
    hourlyPattern.some((row) => Number(row[stage.dataKey]) > 0)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
      <AnalyticsMetricCards>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-200">
            Patient Volume Trend
          </h2>
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-300" /> Daily
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-700" /> 7-day avg
            </span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis
                dataKey="visit_date"
                tick={{ fontSize: 10 }}
                interval={tickInterval}
                angle={-30}
                textAnchor="end"
                height={40}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip cursor={tooltipCursor} contentStyle={tooltipContentStyle} />
              <Line
                type="monotone" dataKey="total_patients"
                stroke="#93c5fd" strokeWidth={1} dot={false}
                name="Daily patients"
              />
              <Line
                type="monotone" dataKey="moving_avg"
                stroke="#1d4ed8" strokeWidth={2.5} dot={false}
                name="7-day average"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsMetricCards>

      <AnalyticsMetricCards>
        <h2 className="text-xl font-extrabold mb-6 text-gray-800 dark:text-gray-200">
          Hourly Wait Time Distribution
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyPattern} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="time_label" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'min', angle: -90, position: 'insideLeft', fontSize: 10, fill: legendTextColor }} />
              <Tooltip
                cursor={tooltipCursor}
                contentStyle={tooltipContentStyle}
                formatter={(value, name) => [`${value} min`, name]}
              />
              <Legend
                wrapperStyle={{ fontSize: '10px', fontWeight: 600, color: legendTextColor }}
                iconType="line"
              />
              {activeStageLines.map((stage) => (
                <Line
                  key={stage.dataKey}
                  type="monotone"
                  dataKey={stage.dataKey}
                  stroke={stage.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={stage.name}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsMetricCards>
    </div>
  );
}