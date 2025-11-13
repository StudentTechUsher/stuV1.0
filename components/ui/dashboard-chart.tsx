"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"

export interface ChartData {
  name: string
  value: number
  [key: string]: unknown
}

interface DashboardChartProps {
  title: string
  data: ChartData[]
  type: "bar" | "donut" | "line"
  className?: string
  dataKey?: string
  xAxisDataKey?: string
  xAxisLabel?: string
  yAxisLabel?: string
  description?: string
}

const CHART_COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "var(--accent)",
  "var(--action-edit)",
  "var(--action-info)",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300"
]

export function DashboardChart({
  title,
  data,
  type,
  className,
  dataKey = "value",
  xAxisDataKey = "name",
  xAxisLabel,
  yAxisLabel,
  description
}: DashboardChartProps) {
  // Function to get color based on data item name
  const getBarColor = (entry: ChartData, index: number) => {
    if (entry.name === "At Risk") {
      return "var(--destructive)" // Red color for "At Risk"
    }
    if (entry.name === "On Track") {
      return "var(--primary)" // Green color for "On Track"
    }
    return CHART_COLORS[index % CHART_COLORS.length]
  }

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey={xAxisDataKey}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--popover-foreground)"
                }}
              />
              <Bar
                dataKey={dataKey}
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry, index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )

      case "donut":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--popover-foreground)"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey={xAxisDataKey}
                stroke="var(--muted-foreground)"
                fontSize={12}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'outside', textAnchor: 'middle', offset: -20 } : undefined}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--popover-foreground)"
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: "var(--primary)", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  return (
    <Card className={`group overflow-hidden !p-0 transition-all duration-200 hover:shadow-md ${className || ''}`}>
      {/* Black header bar - full width spanning entire card top with rounded top corners */}
      <div className="rounded-t-2xl border-b-2 bg-[#0A0A0A] px-6 py-4" style={{ borderColor: "#0A0A0A" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
            {title}
          </h3>
          {description && (
            <div className="relative">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                aria-label="Show chart description"
                title={description}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </button>
              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute right-0 top-8 z-10 w-72 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-3 text-xs leading-relaxed text-[var(--popover-foreground)] opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                {description}
              </div>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-6">
        {renderChart()}
      </CardContent>
    </Card>
  )
}
