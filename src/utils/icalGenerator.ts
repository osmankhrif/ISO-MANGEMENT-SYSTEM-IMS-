import { Audit, Auditor } from '../types/index.ts';

/**
 * RFC 5545 Compliant iCalendar (.ics) Generator for ISO System (IMS) Audit Schedules
 * Compatible with Microsoft Outlook, Microsoft 365, Google Calendar, Apple Calendar, and Windows Calendar.
 */
export class ICalGenerator {
  /**
   * Formats a Date object into iCal UTC timestamp (e.g. 20261001T120000Z)
   */
  private static formatTimestamp(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  /**
   * Formats a YYYY-MM-DD date string into iCal DATE format (e.g. 20261005).
   * For the event end date, RFC 5545 requires the DATE value to be the non-inclusive day following the event.
   */
  private static formatEventDates(
    startDateStr: string,
    endDateStr: string
  ): { dtStart: string; dtEnd: string } {
    const cleanStart = startDateStr.replace(/-/g, '');

    // Parse end date and add 1 calendar day so the final day is fully enclosed
    const endDate = new Date(endDateStr + 'T00:00:00');
    endDate.setDate(endDate.getDate() + 1);
    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const cleanEnd = `${endYear}${endMonth}${endDay}`;

    return { dtStart: cleanStart, dtEnd: cleanEnd };
  }

  /**
   * Escapes text for iCal compliance (commas, semicolons, backslashes, newlines)
   */
  private static escapeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /**
   * Generates VEVENT block for a single audit
   */
  private static generateVEvent(
    audit: Audit,
    leadAuditor?: Auditor,
    teamAuditors: Auditor[] = []
  ): string {
    const now = new Date();
    const dtStamp = this.formatTimestamp(now);
    const { dtStart, dtEnd } = this.formatEventDates(
      audit.plannedStartDate,
      audit.plannedEndDate
    );

    const leadName = leadAuditor ? leadAuditor.name : audit.leadAuditorId;
    const teamNames = teamAuditors.length > 0
      ? teamAuditors.map((a) => a.name).join(', ')
      : 'Solo Lead Auditor';

    const locationStr = `${audit.site || 'Refinery Complex'} - ${audit.area} (${audit.department})`;

    const descriptionLines = [
      `Audit Number: ${audit.auditNumber}`,
      `Type: ${audit.auditType}`,
      `Governing Standard(s): ${audit.standardIds.join(', ')}`,
      `Lead Auditor: ${leadName}`,
      `Audit Team: ${teamNames}`,
      `Plant Site: ${audit.site || 'N/A'}`,
      `Operational Area: ${audit.area}`,
      `Process / Unit: ${audit.process || 'General'}`,
      `Risk Level: ${audit.riskLevel} (${audit.riskScore}/25)`,
      `Status: ${audit.status}`,
      `Priority: ${audit.priority}`,
      `Criteria: ${audit.criteria}`,
      '',
      `Scope: ${audit.scope}`,
      '',
      `Objectives: ${audit.objectives}`,
    ];

    if (audit.specialInstructions) {
      descriptionLines.push('', `Special PPE / Safety Instructions: ${audit.specialInstructions}`);
    }

    const description = this.escapeText(descriptionLines.join('\n'));
    const summary = this.escapeText(`[${audit.auditNumber}] ${audit.title}`);
    const location = this.escapeText(locationStr);
    const categories = this.escapeText(
      ['Audit', audit.auditType, ...audit.standardIds].join(',')
    );

    // RFC 5545 Priority: 1 = High/Critical, 5 = Medium, 9 = Low
    let priorityNum = 5;
    if (audit.priority === 'Critical') priorityNum = 1;
    else if (audit.priority === 'High') priorityNum = 2;
    else if (audit.priority === 'Medium') priorityNum = 5;
    else if (audit.priority === 'Low') priorityNum = 9;

    const statusVal = audit.status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED';

    const lines: string[] = [
      'BEGIN:VEVENT',
      `UID:${audit.auditNumber}-${audit.id}@petroapex.com`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `STATUS:${statusVal}`,
      `PRIORITY:${priorityNum}`,
      `CATEGORIES:${categories}`,
      'TRANSP:OPAQUE',
    ];

    if (leadAuditor?.email) {
      lines.push(
        `ORGANIZER;CN="${this.escapeText(leadAuditor.name)}":mailto:${leadAuditor.email}`
      );
    }

    lines.push('END:VEVENT');
    return lines.join('\r\n');
  }

  /**
   * Generates a complete .ics calendar string for multiple audits
   */
  public static generateICalString(
    audits: Audit[],
    auditors: Auditor[],
    calendarTitle = 'ISO System (IMS) Audit Schedules'
  ): string {
    const auditorMap = new Map<string, Auditor>();
    auditors.forEach((a) => auditorMap.set(a.id, a));

    const events = audits.map((audit) => {
      const lead = auditorMap.get(audit.leadAuditorId);
      const team = audit.teamAuditorIds
        .map((id) => auditorMap.get(id))
        .filter(Boolean) as Auditor[];
      return this.generateVEvent(audit, lead, team);
    });

    const header = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Osman Khrif//ISO System IMS//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeText(calendarTitle)}`,
      'X-WR-CALDESC:Industrial ISO Auditing Schedule exported from ISO System (IMS) by Osman Khrif',
      'X-WR-TIMEZONE:UTC',
    ].join('\r\n');

    const footer = 'END:VCALENDAR\r\n';

    return `${header}\r\n${events.join('\r\n')}\r\n${footer}`;
  }

  /**
   * Triggers a browser download of an .ics calendar file
   */
  public static downloadICalFile(
    icsContent: string,
    filename = 'audit-schedules.ics'
  ): void {
    const cleanFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports a single audit as a .ics file
   */
  public static exportSingleAudit(
    audit: Audit,
    leadAuditor?: Auditor,
    teamAuditors: Auditor[] = []
  ): void {
    const icsContent = this.generateICalString(
      [audit],
      [...(leadAuditor ? [leadAuditor] : []), ...teamAuditors],
      `Audit ${audit.auditNumber}: ${audit.title}`
    );
    const safeNum = audit.auditNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.downloadICalFile(icsContent, `audit-${safeNum}.ics`);
  }

  /**
   * Exports multiple audits as a .ics file
   */
  public static exportMultipleAudits(
    audits: Audit[],
    auditors: Auditor[],
    filenamePrefix = 'audit-schedule'
  ): void {
    const title = `Industrial Audit Schedule (${audits.length} Audits)`;
    const icsContent = this.generateICalString(audits, auditors, title);
    const dateStamp = new Date().toISOString().split('T')[0];
    this.downloadICalFile(icsContent, `${filenamePrefix}-${dateStamp}.ics`);
  }
}
