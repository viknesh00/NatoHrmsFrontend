import { useState } from "react";
import { Activity, BriefcaseBusiness, CalendarDays, Check, ClipboardList, Copy, ExternalLink, FileText, IdCard, Laptop, Mail, MapPin, MessageSquareText, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { StatusChip } from "../../components/ProTable";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";

type WorkStatusDetailSheetProps = {
  record: Record<string, any> | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (record: Record<string, any>) => void;
  onOpenWorkStatuses?: (record: Record<string, any>) => void;
  canEdit?: boolean;
};

const display = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";
  return String(value);
};

function DetailField({ icon: Icon, label, value, multiline = false }: Record<string, any>) {
  return (
    <div className={`work-status-detail-field${multiline ? " is-multiline" : ""}`}>
      <span className="work-status-detail-field-icon"><Icon size={15} aria-hidden="true" /></span>
      <div className="work-status-detail-field-copy">
        <span>{label}</span>
        <strong>{display(value)}</strong>
      </div>
    </div>
  );
}

export default function WorkStatusDetailSheet({ record, onOpenChange, onEdit, onOpenWorkStatuses, canEdit = false }: WorkStatusDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const name = record?.employeeName || [record?.firstName, record?.lastName].filter(Boolean).join(" ") || "Work status record";
  const status = display(record?.workStatus);
  const assets = record?.assetText || (record?.asset ? String(record.asset).split(";").map((item) => item.trim()).filter(Boolean).join(", ") : "N/A");
  const activities = record?.activityText || (record?.activity ? String(record.activity).split(";").map((item) => item.trim()).filter(Boolean).join(", ") : "N/A");
  const comments = record?.commentsText || record?.comments;

  const copyDetails = async () => {
    const text = [
      `Employee: ${name}`,
      `Submission ID: ${display(record?.submissionId)}`,
      `SAL Code: ${display(record?.salCode)}`,
      `Project Manager: ${display(record?.pmName)}`,
      `PM Email: ${display(record?.pmEmail)}`,
      `Work Status: ${status}`,
      `Start Date: ${display(record?.startDateText || record?.startDate)}`,
      `End Date: ${display(record?.endDateText || record?.endDate)}`,
      `Assets: ${display(assets)}`,
      `Activities: ${display(activities)}`,
      `Comments: ${display(comments)}`,
      `Location: ${display([record?.city, record?.country].filter(Boolean).join(", "))}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      ToastSuccess("Work status details copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      ToastError("Could not copy work status details");
    }
  };

  return (
    <Sheet open={Boolean(record)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="work-status-detail-sheet">
        {record && <>
          <SheetHeader className="work-status-detail-header">
            <div className="work-status-detail-heading-icon"><BriefcaseBusiness size={19} aria-hidden="true" /></div>
            <div className="work-status-detail-heading-copy">
              <SheetTitle>{name}</SheetTitle>
              <SheetDescription>Work status record · #{display(record.workStatusId)}</SheetDescription>
            </div>
            <StatusChip label={status} />
          </SheetHeader>

          <div className="work-status-detail-scroll">
            <section className="work-status-detail-section">
              <h3><UserRound size={15} aria-hidden="true" /> Employee</h3>
              <div className="work-status-detail-grid">
                <DetailField icon={IdCard} label="Submission ID" value={record.submissionId} />
                <DetailField icon={IdCard} label="Passport number" value={record.passportNo} />
                <DetailField icon={ShieldCheck} label="Employee status" value={record.employeeStatus} />
                <DetailField icon={ShieldCheck} label="Siemens ID card" value={record.hasSiemensIdCard} />
              </div>
            </section>

            <section className="work-status-detail-section">
              <h3><BriefcaseBusiness size={15} aria-hidden="true" /> Assignment</h3>
              <div className="work-status-detail-grid">
                <DetailField icon={ClipboardList} label="SAL code" value={record.salCode} />
                <DetailField icon={UserRound} label="Project manager" value={record.pmName} />
                <DetailField icon={Mail} label="PM email" value={record.pmEmail} />
                <DetailField icon={CalendarDays} label="Start date" value={record.startDateText || record.startDate} />
                <DetailField icon={CalendarDays} label="End date" value={record.endDateText || record.endDate} />
              </div>
            </section>

            <section className="work-status-detail-section">
              <h3><MapPin size={15} aria-hidden="true" /> Location and work details</h3>
              <div className="work-status-detail-grid">
                <DetailField icon={MapPin} label="City" value={record.city} />
                <DetailField icon={MapPin} label="Country" value={record.country} />
                <DetailField icon={Laptop} label="Assets" value={assets} />
                <DetailField icon={Activity} label="Activities" value={activities} />
              </div>
            </section>

            <section className="work-status-detail-section">
              <h3><MessageSquareText size={15} aria-hidden="true" /> Comments</h3>
              <div className="work-status-detail-comment"><FileText size={15} aria-hidden="true" /><p>{display(comments)}</p></div>
            </section>
          </div>

          <div className="work-status-detail-actions">
            <Button type="button" variant="outline" onClick={copyDetails}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy details"}</Button>
            {onOpenWorkStatuses && <Button type="button" variant="outline" onClick={() => onOpenWorkStatuses(record)}><ExternalLink size={15} /> Related records</Button>}
            {canEdit && onEdit && <Button type="button" onClick={() => onEdit(record)}><Pencil size={15} /> Edit record</Button>}
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}
