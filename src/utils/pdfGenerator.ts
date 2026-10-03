import { jsPDF } from 'jspdf';
import { Audit, Auditor, Finding, ChecklistItem, AuditResponseRecord, CorrectiveAction, SystemSettings } from '../types/index.ts';

export class PdfReportGenerator {
  static generateAuditReport(params: {
    audit: Audit;
    leadAuditor: Auditor | null;
    teamAuditors: Auditor[];
    checklistItems: ChecklistItem[];
    responses: AuditResponseRecord[];
    findings: Finding[];
    correctiveActions: Record<string, CorrectiveAction>;
    settings: SystemSettings;
  }): void {
    const { audit, leadAuditor, teamAuditors, checklistItems, responses, findings, correctiveActions, settings } = params;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    let y = margin;

    // Helper for footer
    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `${settings.companyName} | ${audit.auditNumber} - CONFIDENTIAL ISO AUDIT REPORT`,
        margin,
        pageHeight - 8
      );
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
    };

    // Helper to check page break
    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 16) {
        doc.addPage();
        y = margin;
      }
    };

    // 1. Cover / Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, pageWidth - margin * 2, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(settings.companyName.toUpperCase(), margin + 5, y + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`Facility: ${settings.facilityName}`, margin + 5, y + 15);
    doc.text(`Report Date: ${new Date().toISOString().split('T')[0]} | Standard(s): ${audit.standardIds.join(', ')}`, margin + 5, y + 21);

    y += 32;

    // 2. Report Title & Document Control Block
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('FORMAL INTERNAL AUDIT REPORT', margin, y);
    y += 6;

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(audit.title, margin, y);
    y += 8;

    // Metadata Grid Box
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageWidth - margin * 2, 34, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const col1 = margin + 4;
    const col2 = margin + 50;
    const col3 = margin + 98;
    const col4 = margin + 140;

    let rowY = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Number:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(audit.auditNumber, col2, rowY);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Type:', col3, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(audit.auditType, col4, rowY);

    rowY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Department:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(audit.department, col2, rowY);
    doc.setFont('helvetica', 'bold');
    doc.text('Area / Unit:', col3, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(audit.area || 'N/A', col4, rowY);

    rowY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Planned Dates:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${audit.plannedStartDate} to ${audit.plannedEndDate}`, col2, rowY);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Status:', col3, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(audit.status, col4, rowY);

    rowY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Lead Auditor:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(leadAuditor ? `${leadAuditor.name} (${leadAuditor.qualification})` : 'Assigned Lead', col2, rowY);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Level:', col3, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${audit.riskLevel} (Score: ${audit.riskScore}/25)`, col4, rowY);

    rowY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Team:', col1, rowY);
    doc.setFont('helvetica', 'normal');
    const teamNames = teamAuditors.map(a => a.name).join(', ') || 'N/A';
    doc.text(teamNames, col2, rowY);

    y += 40;

    // 3. Objectives, Scope & Criteria
    ensureSpace(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. AUDIT OBJECTIVE & SCOPE', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const objLines = doc.splitTextToSize(`Objective: ${audit.objectives || 'Evaluate management system compliance and operational discipline.'}`, pageWidth - margin * 2);
    doc.text(objLines, margin, y);
    y += objLines.length * 4.5 + 2;

    const scopeLines = doc.splitTextToSize(`Scope: ${audit.scope || 'Covering facility operational units, documentation, personnel interviews, and records.'}`, pageWidth - margin * 2);
    doc.text(scopeLines, margin, y);
    y += scopeLines.length * 4.5 + 2;

    const critLines = doc.splitTextToSize(`Criteria: ${audit.criteria || audit.standardIds.join(', ')}`, pageWidth - margin * 2);
    doc.text(critLines, margin, y);
    y += critLines.length * 4.5 + 6;

    // 4. Executive Summary
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. EXECUTIVE SUMMARY', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const summaryText = audit.executiveSummary ||
      `The audit team conducted field observations, operator interviews, and verification of objective evidence against applicable standards. ` +
      `Overall adherence to operational protocols was verified, with specific areas requiring corrective action detailed below.`;
    const execLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
    doc.text(execLines, margin, y);
    y += execLines.length * 4.5 + 6;

    // 5. Findings Breakdown Table
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`3. FINDINGS & NONCONFORMITIES (${findings.length} Total)`, margin, y);
    y += 6;

    if (findings.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No nonconformities or adverse findings were identified during this audit.', margin, y);
      y += 8;
    } else {
      findings.forEach((fnd, idx) => {
        ensureSpace(38);

        // Header strip for finding
        doc.setFillColor(fnd.category.includes('Major') ? 254 : 241, fnd.category.includes('Major') ? 242 : 245, fnd.category.includes('Major') ? 242 : 249);
        doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(fnd.category.includes('Major') ? 185 : 15, fnd.category.includes('Major') ? 28 : 23, fnd.category.includes('Major') ? 28 : 42);
        doc.text(`${idx + 1}. [${fnd.findingNumber}] ${fnd.category} - Clause ${fnd.clauseNumber} (${fnd.standardCode})`, margin + 3, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Status: ${fnd.status} | Risk: ${fnd.riskLevel} | Due: ${fnd.dueDate}`, pageWidth - margin - 75, y + 4.5);
        y += 9;

        // Details
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Requirement:', margin + 3, y);
        doc.setFont('helvetica', 'normal');
        const reqLines = doc.splitTextToSize(fnd.requirementText, pageWidth - margin * 2 - 25);
        doc.text(reqLines, margin + 25, y);
        y += Math.max(reqLines.length * 3.8, 4) + 1;

        doc.setFont('helvetica', 'bold');
        doc.text('Condition:', margin + 3, y);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(fnd.description, pageWidth - margin * 2 - 25);
        doc.text(descLines, margin + 25, y);
        y += descLines.length * 3.8 + 1;

        doc.setFont('helvetica', 'bold');
        doc.text('Evidence:', margin + 3, y);
        doc.setFont('helvetica', 'normal');
        const evLines = doc.splitTextToSize(fnd.objectiveEvidence, pageWidth - margin * 2 - 25);
        doc.text(evLines, margin + 25, y);
        y += evLines.length * 3.8 + 2;

        // Root cause / CAPA if available
        const capa = correctiveActions[fnd.id];
        if (capa && capa.correctiveActionPlan) {
          doc.setFont('helvetica', 'bold');
          doc.text('CAPA Plan:', margin + 3, y);
          doc.setFont('helvetica', 'normal');
          const capaLines = doc.splitTextToSize(`${capa.correctiveActionPlan} (Owner: ${capa.responsiblePerson})`, pageWidth - margin * 2 - 25);
          doc.text(capaLines, margin + 25, y);
          y += capaLines.length * 3.8 + 2;
        }

        y += 4;
      });
    }

    // 6. Checklist Summary
    ensureSpace(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. CHECKLIST EVALUATION SUMMARY', margin, y);
    y += 6;

    const conformingCount = responses.filter(r => r.responseValue === 'Conforming').length;
    const nonconformingCount = responses.filter(r => r.responseValue === 'Nonconforming').length;
    const ofiCount = responses.filter(r => r.responseValue === 'Opportunity for Improvement' || r.responseValue === 'Observation').length;
    const naCount = responses.filter(r => r.responseValue === 'Not Applicable').length;
    const totalResp = responses.length || 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Questions Evaluated: ${checklistItems.length}`, margin, y);
    y += 5;
    doc.text(`Conforming: ${conformingCount} (${Math.round((conformingCount / totalResp) * 100)}%)  |  Nonconforming: ${nonconformingCount}  |  Observations/OFI: ${ofiCount}  |  N/A: ${naCount}`, margin, y);
    y += 8;

    // 7. Audit Conclusion & Recommendations
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('5. AUDIT CONCLUSION & RECOMMENDATIONS', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const conclusionText = audit.conclusion ||
      `Based on the sample of evidence reviewed, the management system operates with acceptable operational discipline. ` +
      `Responsible managers must submit formal root cause analyses and corrective action plans within the designated due dates.`;
    const conclLines = doc.splitTextToSize(conclusionText, pageWidth - margin * 2);
    doc.text(conclLines, margin, y);
    y += conclLines.length * 4.5 + 8;

    // 8. Sign-off / Approvals Block
    ensureSpace(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('6. FORMAL SIGN-OFF & APPROVALS', margin, y);
    y += 6;

    const boxW = (pageWidth - margin * 2 - 8) / 2;
    // Lead Auditor box
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, boxW, 24);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LEAD AUDITOR VERIFICATION', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${leadAuditor?.name || 'Assigned Lead Auditor'}`, margin + 3, y + 11);
    doc.text(`Signature: Verified Electronically`, margin + 3, y + 16);
    doc.text(`Date: ${audit.actualEndDate || new Date().toISOString().split('T')[0]}`, margin + 3, y + 21);

    // Management Representative box
    doc.rect(margin + boxW + 8, y, boxW, 24);
    doc.setFont('helvetica', 'bold');
    doc.text('FACILITY MANAGEMENT ACCEPTANCE', margin + boxW + 11, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${audit.approvedBy || 'Operations & Quality Director'}`, margin + boxW + 11, y + 11);
    doc.text(`Signature: Accepted into CAPA Workflow`, margin + boxW + 11, y + 16);
    doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, margin + boxW + 11, y + 21);

    // Add page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    doc.save(`${audit.auditNumber}_Audit_Report.pdf`);
  }

  static generateAuditPlan(audit: Audit, leadAuditor: Auditor | null, teamAuditors: Auditor[], settings: SystemSettings): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    let y = margin;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(settings.companyName.toUpperCase(), margin + 5, y + 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`OFFICIAL AUDIT PLAN - ${audit.auditNumber}`, margin + 5, y + 16);

    y += 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Audit Plan: ${audit.title}`, margin, y);
    y += 8;

    // Table of specifics
    const rows = [
      ['Audit Number:', audit.auditNumber, 'Audit Type:', audit.auditType],
      ['Department:', audit.department, 'Process/Area:', `${audit.area} / ${audit.process}`],
      ['Standard(s):', audit.standardIds.join(', '), 'Risk Level:', `${audit.riskLevel} (Score ${audit.riskScore})`],
      ['Scheduled Dates:', `${audit.plannedStartDate} to ${audit.plannedEndDate}`, 'Lead Auditor:', leadAuditor?.name || 'TBD'],
      ['Audit Team:', teamAuditors.map(a => a.name).join(', ') || 'N/A', 'Priority:', audit.priority],
    ];

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 36, 'FD');

    let ry = y + 6;
    doc.setFontSize(8.5);
    rows.forEach(r => {
      doc.setFont('helvetica', 'bold');
      doc.text(r[0], margin + 4, ry);
      doc.setFont('helvetica', 'normal');
      doc.text(r[1], margin + 35, ry);
      doc.setFont('helvetica', 'bold');
      doc.text(r[2], margin + 98, ry);
      doc.setFont('helvetica', 'normal');
      doc.text(r[3], margin + 125, ry);
      ry += 6;
    });

    y += 42;

    const sections = [
      { title: '1. Audit Objectives', text: audit.objectives || 'Verify process conformity and evaluate operational discipline.' },
      { title: '2. Audit Scope', text: audit.scope || 'All physical equipment, control rooms, permit logs, and personnel in area.' },
      { title: '3. Audit Criteria', text: audit.criteria || audit.standardIds.join(', ') },
      { title: '4. Known Risks & Safety Requirements', text: audit.knownRisks || 'Standard industrial PPE required.' },
      { title: '5. Special Instructions & Document Requirements', text: audit.specialInstructions || 'Coordinate with Shift Superintendent before entry.' },
      { title: '6. Previous Audit Findings to Review', text: audit.previousFindingsSummary || 'Verify past turnaround punchlist closure.' },
    ];

    sections.forEach(s => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(s.title, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(s.text, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.2 + 5;
    });

    doc.save(`${audit.auditNumber}_Audit_Plan.pdf`);
  }
}
