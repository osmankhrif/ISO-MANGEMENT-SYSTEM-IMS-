import * as XLSX from 'xlsx';
import { Audit, ChecklistItem, Finding } from '../types/index.ts';

export class ExcelService {
  // Export Checklist to Excel
  static exportChecklist(items: ChecklistItem[], title: string): void {
    const data = items.map((item, idx) => ({
      Index: idx + 1,
      'Clause Number': item.clauseNumber,
      Standard: item.standardCode,
      Requirement: item.requirement,
      Question: item.question,
      'Evidence Required': item.evidenceRequired,
      Department: item.department,
      Process: item.process,
      'Risk Level': item.riskLevel,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Checklist');
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_Checklist.xlsx`);
  }

  // Parse Excel / CSV into Checklist Items
  static async importChecklistFile(file: File): Promise<Partial<ChecklistItem>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<any>(firstSheet);

          const items: Partial<ChecklistItem>[] = rows.map((r, idx) => ({
            clauseNumber: String(r['Clause Number'] || r['Clause'] || r['clauseNumber'] || `1.${idx + 1}`),
            standardCode: String(r['Standard'] || r['Standard Code'] || 'ISO 9001'),
            requirement: String(r['Requirement'] || r['Title'] || ''),
            question: String(r['Question'] || r['Audit Question'] || r['requirement'] || ''),
            evidenceRequired: String(r['Evidence Required'] || r['Evidence'] || ''),
            department: String(r['Department'] || 'Operations'),
            process: String(r['Process'] || ''),
            riskLevel: (r['Risk Level'] || r['Risk'] || 'Medium') as any,
            sortOrder: idx + 1,
          }));

          resolve(items);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Export Audits to Excel / CSV
  static exportAudits(audits: Audit[], format: 'xlsx' | 'csv' = 'xlsx'): void {
    const data = audits.map(a => ({
      'Audit Number': a.auditNumber,
      Title: a.title,
      Type: a.auditType,
      Department: a.department,
      Area: a.area,
      Process: a.process,
      'Standards Audited': a.standardIds.join(', '),
      'Planned Start': a.plannedStartDate,
      'Planned End': a.plannedEndDate,
      'Actual Start': a.actualStartDate || '',
      'Actual End': a.actualEndDate || '',
      'Risk Level': a.riskLevel,
      'Risk Score': a.riskScore,
      Status: a.status,
      Priority: a.priority,
      Objectives: a.objectives,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audits');

    if (format === 'csv') {
      XLSX.writeFile(workbook, 'ISO_System_IMS_Audit_Program.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'ISO_System_IMS_Audit_Program.xlsx');
    }
  }

  // Export Findings to Excel
  static exportFindings(findings: Finding[]): void {
    const data = findings.map(f => ({
      'Finding Number': f.findingNumber,
      'Audit ID': f.auditId,
      'Date Identified': f.dateIdentified,
      Category: f.category,
      Department: f.department,
      Process: f.process,
      Standard: f.standardCode,
      Clause: f.clauseNumber,
      Requirement: f.requirementText,
      Description: f.description,
      'Objective Evidence': f.objectiveEvidence,
      'Risk Level': f.riskLevel,
      'Responsible Person': f.responsiblePerson,
      'Due Date': f.dueDate,
      Status: f.status,
      'Closure Date': f.closureDate || '',
      'Repeat Finding': f.isRepeat ? 'Yes' : 'No',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Findings');
    XLSX.writeFile(workbook, 'ISO_System_IMS_Findings_Log.xlsx');
  }
}
