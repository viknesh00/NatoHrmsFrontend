import { useEffect, useMemo, useRef, useState } from "react";
import { hierarchy, linkHorizontal, select, tree } from "d3";
import { Search, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../components/ui/input-group";

type EmployeeRecord = Record<string, any>;
type OrgNode = { id: string; name: string; role: string; department: string; email: string; employeeId: string; children?: OrgNode[] };

function valueOf(employee: EmployeeRecord, keys: string[]) {
  for (const key of keys) {
    const value = employee[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function createOrgTree(employees: EmployeeRecord[]): OrgNode {
  const people: OrgNode[] = employees.map((employee, index) => ({
    id: valueOf(employee, ["email", "userEmail", "employeeId", "employeeID"]) || `employee-${index}`,
    name: [employee.firstName, employee.lastName].filter(Boolean).join(" ") || valueOf(employee, ["userName", "name"]) || "Employee",
    role: valueOf(employee, ["designation", "accessRole", "role"]) || "Team member",
    department: valueOf(employee, ["department"]),
    email: valueOf(employee, ["email", "userEmail"]),
    employeeId: valueOf(employee, ["employeeId", "employeeID"]),
  }));
  const sourceByEmail = new Map<string, number>();
  const sourceByName = new Map<string, number>();
  employees.forEach((employee, index) => {
    const email = valueOf(employee, ["email", "userEmail"]).toLowerCase();
    const name = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim().toLowerCase();
    if (email) sourceByEmail.set(email, index);
    if (name) sourceByName.set(name, index);
  });

  const parents = employees.map((employee, index) => {
    const manager = valueOf(employee, ["reportingManager", "managerEmail", "managerName"]).toLowerCase();
    if (!manager) return -1;
    const parent = sourceByEmail.get(manager) ?? sourceByName.get(manager);
    return parent === index || parent == null ? -1 : parent;
  });

  // Break malformed cycles safely so the hierarchy can always render.
  parents.forEach((parent, index) => {
    const seen = new Set([index]);
    let cursor = parent;
    while (cursor >= 0) {
      if (seen.has(cursor)) { parents[index] = -1; break; }
      seen.add(cursor);
      cursor = parents[cursor];
    }
  });

  const children = people.map(() => [] as OrgNode[]);
  people.forEach((person, index) => {
    const parent = parents[index];
    if (parent >= 0) children[parent].push(person);
  });
  people.forEach((person, index) => { if (children[index].length) person.children = children[index]; });
  const roots = people.filter((_, index) => parents[index] < 0);
  return { id: "organization-root", name: "Organization", role: `${employees.length} ${employees.length === 1 ? "employee" : "employees"}`, department: "", email: "", employeeId: "", children: roots };
}

function filterOrgTree(node: OrgNode, query: string): OrgNode | null {
  if (!query) return node;
  const term = query.toLocaleLowerCase();
  const matches = [node.name, node.role, node.department, node.email, node.employeeId]
    .some((value) => value.toLocaleLowerCase().includes(term));
  if (matches) return node;
  const children = node.children?.map((child) => filterOrgTree(child, query)).filter((child): child is OrgNode => Boolean(child));
  return children?.length ? { ...node, children } : null;
}

function countOrgMatches(node: OrgNode, query: string): number {
  if (!query) return 0;
  const term = query.toLocaleLowerCase();
  const ownMatch = node.id !== "organization-root" && [node.name, node.role, node.department, node.email, node.employeeId]
    .some((value) => value.toLocaleLowerCase().includes(term));
  return Number(ownMatch) + (node.children || []).reduce((total, child) => total + countOrgMatches(child, query), 0);
}

export default function OrganizationDendrogram({ employees, loading }: { employees: EmployeeRecord[]; loading: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState("");
  const rootData = useMemo(() => createOrgTree(employees), [employees]);
  const displayData = useMemo(() => filterOrgTree(rootData, query.trim()), [rootData, query]);
  const resultCount = useMemo(() => countOrgMatches(rootData, query.trim()), [rootData, query]);

  useEffect(() => {
    if (loading || !svgRef.current) return;
    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    if (!displayData?.children?.length) return;

    if (!collapsed) {
      const initiallyCollapsed = new Set<string>();
      const collectBranches = (node: OrgNode) => {
        if (node.id !== rootData.id && node.children?.length) initiallyCollapsed.add(node.id);
        node.children?.forEach(collectBranches);
      };
      rootData.children.forEach(collectBranches);
      setCollapsed(initiallyCollapsed);
      return;
    }

    const root = hierarchy(displayData, (node) => !query.trim() && collapsed.has(node.id) ? null : node.children);
    const layout = tree<OrgNode>().nodeSize([96, 240]);
    layout(root);
    const nodes = root.descendants();
    const links = root.links();
    const minX = Math.min(...nodes.map((node) => node.x));
    const maxX = Math.max(...nodes.map((node) => node.x));
    const width = Math.max(720, (root.height + 1) * 240 + 240);
    const height = Math.max(300, maxX - minX + 144);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 0 : 560;

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
    const group = svg.append("g").attr("transform", `translate(120, ${72 - minX})`);
    const path = linkHorizontal<any, any>().x((point) => point.y).y((point) => point.x);

    group.selectAll<SVGPathElement, typeof links[number]>(".org-chart-link")
      .data(links)
      .join("path")
      .attr("class", "org-chart-link")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", function () { return `${this.getTotalLength()} ${this.getTotalLength()}`; })
      .attr("stroke-dashoffset", function () { return this.getTotalLength(); })
      .transition().duration(duration).ease((t) => t)
      .attr("stroke-dashoffset", 0);

    const card = group.selectAll<SVGGElement, typeof nodes[number]>(".org-chart-node")
      .data(nodes)
      .join("g")
      .attr("class", (node) => `org-chart-node${node.depth === 0 ? " is-root" : ""}${node.data.children?.length ? " is-expandable" : ""}`)
      .attr("transform", (node) => `translate(${node.y},${node.x})`)
      .attr("opacity", 0);
    card
      .attr("role", (node) => node.data.children?.length ? "button" : null)
      .attr("tabindex", (node) => node.data.children?.length ? 0 : null)
      .attr("aria-expanded", (node) => node.data.children?.length ? String(!collapsed.has(node.data.id)) : null)
      .attr("aria-label", (node) => node.data.children?.length ? `${node.data.name}, ${collapsed.has(node.data.id) ? "collapsed" : "expanded"}. ${node.data.children.length} direct reports. Activate to toggle.` : null)
      .on("click", (_event, node) => {
        if (!node.data.children?.length) return;
        setCollapsed((current) => {
          const next = new Set(current || []);
          if (next.has(node.data.id)) next.delete(node.data.id);
          else next.add(node.data.id);
          return next;
        });
      })
      .on("keydown", (event: KeyboardEvent, node) => {
        if ((event.key === "Enter" || event.key === " ") && node.data.children?.length) {
          event.preventDefault();
          setCollapsed((current) => {
            const next = new Set(current || []);
            if (next.has(node.data.id)) next.delete(node.data.id);
            else next.add(node.data.id);
            return next;
          });
        }
      });
    card.transition().delay((node) => Math.min(node.depth * 90, 270)).duration(duration).attr("opacity", 1);
    card.append("rect").attr("x", -92).attr("y", -36).attr("width", 184).attr("height", 72).attr("rx", 4);
    card.append("circle").attr("class", "org-chart-avatar").attr("cx", -70).attr("cy", -12).attr("r", 13);
    card.append("text").attr("class", "org-chart-initial").attr("x", -70).attr("y", -8).attr("text-anchor", "middle")
      .text((node) => node.data.name.slice(0, 1).toUpperCase());
    card.append("text").attr("class", "org-chart-name").attr("x", -49).attr("y", -15)
      .text((node) => node.data.name.length > 17 ? `${node.data.name.slice(0, 16)}…` : node.data.name);
    card.append("text").attr("class", "org-chart-role").attr("x", -70).attr("y", 13)
      .text((node) => node.data.role.length > 25 ? `${node.data.role.slice(0, 24)}…` : node.data.role);
    card.append("text").attr("class", "org-chart-department").attr("x", -70).attr("y", 27)
      .text((node) => node.data.department.length > 25 ? `${node.data.department.slice(0, 24)}…` : node.data.department);
    const toggles = card.filter((node) => Boolean(node.data.children?.length));
    toggles.append("circle").attr("class", "org-chart-toggle").attr("cx", 78).attr("cy", 0).attr("r", 9);
    toggles.append("text").attr("class", "org-chart-toggle-mark").attr("x", 78).attr("y", 4).attr("text-anchor", "middle")
      .text((node) => collapsed.has(node.data.id) ? "+" : "−");
    card.append("title").text((node) => [node.data.name, node.data.role, node.data.department, node.data.email, node.data.employeeId].filter(Boolean).join(" · "));
  }, [loading, rootData, displayData, collapsed, query]);

  if (loading) return <div className="org-chart-state" role="status">Loading reporting structure…</div>;
  if (!employees.length) return <div className="org-chart-state">No employee reporting relationships are available.</div>;

  return <div className="org-chart-content">
    <div className="org-chart-search-row">
      <InputGroup className="org-chart-search">
        <InputGroupAddon><Search size={16} aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput aria-label="Search organization" placeholder="Search people, roles, departments…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <InputGroupAddon align="inline-end"><button type="button" className="org-chart-search-clear" aria-label="Clear organization search" onClick={() => setQuery("")}><X size={15} /></button></InputGroupAddon>}
      </InputGroup>
      <span className="org-chart-search-count" aria-live="polite">{query ? `${resultCount} result${resultCount === 1 ? "" : "s"}` : `${employees.length} people`}</span>
    </div>
    {query && resultCount === 0
      ? <div className="org-chart-state" role="status">No matching people found.</div>
      : <div className="org-chart-scroll" role="region" aria-label="Organization hierarchy" tabIndex={0}><svg ref={svgRef} className="org-chart-svg" role="img" aria-label="Animated, expandable left-to-right organization hierarchy" /></div>}
  </div>;
}
