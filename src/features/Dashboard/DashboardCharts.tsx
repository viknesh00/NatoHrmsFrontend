import { useEffect, useMemo, useRef } from "react";
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import { max, scaleBand, scaleLinear, select } from "d3";
import { useCanvasColors } from "@/theme/canvasColors";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip);

type AttendanceSeries = {
  present: number;
  onLeave: number;
  pending: number;
  absent: number;
};

type DepartmentDatum = { department: string; count: number };
type KpiDatum = { label: string; value: number | string; color: string };
type AttendanceRow = { status?: string; attendanceStatus?: string };

const CHART_COLORS = {
  "--success": "#276749",
  "--information": "#245f92",
  "--warning": "#854d0e",
  "--error": "#b42332",
  "--foreground": "#252a30",
  "--muted-foreground": "#676c73",
  "--border": "#e3e5ea",
  "--popover": "#ffffff",
};

export function AttendanceChart({ values }: { values: AttendanceSeries }) {
  const palette = useCanvasColors(CHART_COLORS);
  const data = useMemo(() => ({
    labels: ["Present", "On leave", "Pending leave", "Absent"],
    datasets: [{
      data: [values.present, values.onLeave, values.pending, values.absent],
      backgroundColor: [palette["--success"], palette["--information"], palette["--warning"], palette["--error"]],
      borderRadius: 4,
      borderSkipped: false,
      barThickness: 18,
    }],
  }), [palette, values]);
  const options = useMemo(() => ({
    indexAxis: "y" as const,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: palette["--popover"], titleColor: palette["--foreground"], bodyColor: palette["--foreground"], borderColor: palette["--border"], borderWidth: 1, callbacks: { label: (context) => ` ${context.formattedValue} people/requests` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0, color: palette["--muted-foreground"] }, grid: { color: palette["--border"] } },
      y: { ticks: { color: palette["--foreground"] }, grid: { display: false } },
    },
  }), [palette]);

  return (
    <div className="dashboard-chart-canvas" role="img" aria-label={`Today's counts: ${values.present} present, ${values.onLeave} on leave, ${values.pending} pending leave, ${values.absent} absent`}>
      <Bar data={data} options={options} />
    </div>
  );
}

export function PersonalAttendanceChart({ rows }: { rows: AttendanceRow[] }) {
  const counts = useMemo(() => {
    const result = { present: 0, absent: 0, leave: 0, nonWorking: 0 };
    rows.forEach((row) => {
      const status = String(row.status ?? row.attendanceStatus ?? "").trim().toLowerCase();
      if (status.includes("present")) result.present += 1;
      else if (status.includes("absent")) result.absent += 1;
      else if (status.includes("leave")) result.leave += 1;
      else if (["wo", "weekly off", "holiday", "weekend"].some((value) => status.includes(value))) result.nonWorking += 1;
    });
    return result;
  }, [rows]);
  const palette = useCanvasColors(CHART_COLORS);
  const data = useMemo(() => ({
    labels: ["Present", "Absent", "Leave", "Non-working"],
    datasets: [{ data: [counts.present, counts.absent, counts.leave, counts.nonWorking], backgroundColor: [palette["--success"], palette["--error"], palette["--information"], palette["--muted-foreground"]], borderRadius: 4, borderSkipped: false, maxBarThickness: 44 }],
  }), [palette, counts]);
  const options = useMemo(() => ({
    maintainAspectRatio: false,
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: palette["--popover"], titleColor: palette["--foreground"], bodyColor: palette["--foreground"], borderColor: palette["--border"], borderWidth: 1, callbacks: { label: (context) => ` ${context.formattedValue} days` } } },
    scales: {
      x: { ticks: { color: palette["--muted-foreground"] }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0, color: palette["--muted-foreground"] }, grid: { color: palette["--border"] } },
    },
  }), [palette]);
  const total = counts.present + counts.absent + counts.leave + counts.nonWorking;
  return total ? (
    <div className="dashboard-chart-canvas" role="img" aria-label={`My attendance this month: ${counts.present} present, ${counts.absent} absent, ${counts.leave} leave, ${counts.nonWorking} non-working days`}>
      <Bar data={data} options={options} />
    </div>
  ) : <div className="py-8 text-center text-sm text-muted-foreground">No attendance records this month</div>;
}

export function KpiSnapshotChart({ data }: { data: KpiDatum[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rows = useMemo(() => data.map(item => {
    const parsed = typeof item.value === "number" ? item.value : Number(item.value);
    return { ...item, amount: Number.isFinite(parsed) ? Math.max(0, parsed) : item.value === "Yes" ? 1 : 0, display: String(item.value ?? "N/A") };
  }), [data]);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const svg = select(node);
    const render = () => {
      const width = Math.max(260, Math.round(node.getBoundingClientRect().width));
      const left = Math.min(190, Math.max(112, width * 0.3));
      const right = Math.min(62, Math.max(42, width * 0.12));
      const rowHeight = 44;
      const height = Math.max(72, rows.length * rowHeight + 16);
      const maximum = max(rows, row => row.amount) || 1;
      const x = scaleLinear().domain([0, maximum]).nice().range([left, width - right]);
      const y = scaleBand<string>().domain(rows.map(row => row.label)).range([8, height - 8]).padding(0.24);
      svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
      const bars = svg.selectAll<SVGGElement, typeof rows[number]>("g.dashboard-kpi-row")
        .data(rows, row => row.label)
        .join(enter => {
          const group = enter.append("g").attr("class", "dashboard-kpi-row");
          group.append("text").attr("class", "dashboard-kpi-label");
          group.append("rect").attr("class", "dashboard-kpi-track");
          group.append("rect").attr("class", "dashboard-kpi-bar");
          group.append("text").attr("class", "dashboard-kpi-count");
          return group;
        })
        .attr("transform", row => `translate(0,${y(row.label) ?? 0})`);

      bars.select(".dashboard-kpi-label").attr("x", left - 10).attr("y", y.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "end").text(row => row.label);
      bars.select(".dashboard-kpi-track").attr("x", left).attr("y", 0).attr("height", y.bandwidth()).attr("width", Math.max(0, width - left - right)).attr("rx", 4);
      bars.select(".dashboard-kpi-bar").attr("x", left).attr("y", 0).attr("height", y.bandwidth()).attr("width", row => Math.max(0, x(row.amount) - left)).attr("rx", 4).attr("fill", row => row.color);
      bars.select(".dashboard-kpi-count").attr("x", width - right + 8).attr("y", y.bandwidth() / 2).attr("dy", "0.35em").text(row => row.display);
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(node);
    return () => { observer.disconnect(); svg.selectAll("*").remove(); };
  }, [rows]);

  const description = rows.map(row => `${row.label}: ${row.display}`).join(", ");
  return <svg ref={svgRef} className="dashboard-kpi-chart" role="img" aria-label={`Dashboard key performance indicators. ${description}`} />;
}

export function DepartmentChart({ data }: { data: DepartmentDatum[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const rows = data.filter(item => item.department && Number.isFinite(item.count));
    const svg = select(node);
    const render = () => {
      const width = Math.max(260, Math.round(node.getBoundingClientRect().width));
      const longestLabel = max(rows, row => row.department.length) || 0;
      const left = Math.min(width * 0.52, Math.max(112, Math.min(longestLabel * 7.2, width * 0.46)));
      const maxLabelLength = Math.max(8, Math.floor((left - 18) / 7));
      const right = 50;
      const rowHeight = 36;
      const height = Math.max(72, rows.length * rowHeight + 16);
      const x = scaleLinear().domain([0, max(rows, row => row.count) || 1]).nice().range([left, Math.max(left + 1, width - right)]);
      const y = scaleBand<string>().domain(rows.map(row => row.department)).range([8, height - 8]).padding(0.28);
      svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
      const groups = svg.selectAll<SVGGElement, DepartmentDatum>("g.department-bar")
        .data(rows, row => row.department)
        .join(enter => {
          const group = enter.append("g").attr("class", "department-bar");
          group.append("text").attr("class", "department-bar-label");
          group.append("rect").attr("class", "department-bar-track");
          group.append("rect").attr("class", "department-bar-value");
          group.append("text").attr("class", "department-bar-count");
          return group;
        })
        .attr("transform", row => `translate(0,${y(row.department) ?? 0})`);

      groups.select(".department-bar-label")
        .attr("x", left - 10).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .text(row => row.department.length > maxLabelLength ? `${row.department.slice(0, maxLabelLength - 1)}…` : row.department);
      groups.select(".department-bar-track")
        .attr("x", left).attr("y", 0).attr("height", y.bandwidth())
        .attr("width", Math.max(0, width - left - right)).attr("rx", 4);
      groups.select(".department-bar-value")
        .attr("x", left).attr("y", 0).attr("height", y.bandwidth())
        .attr("width", row => Math.max(0, x(row.count) - left)).attr("rx", 4);
      groups.select(".department-bar-count")
        .attr("x", width - right + 8).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")
        .text(row => String(row.count));
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(node);
    return () => { observer.disconnect(); svg.selectAll("*").remove(); };
  }, [data]);

  const description = data.map(row => `${row.department}: ${row.count}`).join(", ");
  return (
    <svg ref={svgRef} className="dashboard-department-chart" role="img" aria-label={`Employees by department. ${description}`} />
  );
}
