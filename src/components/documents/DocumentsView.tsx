import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { DocumentEvidence } from '../../types/index.ts';
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Search,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Lock,
  Plus,
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, currentUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedAuditFilter, setSelectedAuditFilter] = useState('All');

  const documents = useMemo(() => DbService.getDocuments(), [dataVersion]);
  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);
  const findings = useMemo(() => DbService.getFindings(), [dataVersion]);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    revision: 'Rev 1.0',
    confidentiality: 'Internal' as const,
    relatedAuditId: '',
    relatedFindingId: '',
    description: '',
    fileDataBase64: '',
    fileSize: 0,
    fileType: 'pdf' as DocumentEvidence['fileType'],
    mimeType: 'application/pdf',
  });

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        !search.trim() ||
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.description.toLowerCase().includes(search.toLowerCase()) ||
        doc.owner.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'All' || doc.fileType === typeFilter;
      const matchAudit = selectedAuditFilter === 'All' || doc.relatedAuditId === selectedAuditFilter;

      return matchSearch && matchType && matchAudit;
    });
  }, [documents, search, typeFilter, selectedAuditFilter]);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let detectedType: DocumentEvidence['fileType'] = 'other';
    if (file.type.includes('pdf')) detectedType = 'pdf';
    else if (file.type.includes('image')) detectedType = 'image';
    else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.type.includes('sheet')) detectedType = 'excel';
    else if (file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.type.includes('word')) detectedType = 'word';
    else if (file.type.includes('text')) detectedType = 'text';

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadForm((prev) => ({
        ...prev,
        name: file.name,
        fileSize: file.size,
        fileDataBase64: base64,
        fileType: detectedType,
        mimeType: file.type || 'application/octet-stream',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name) return;

    DbService.saveDocument(
      {
        ...uploadForm,
        owner: currentUser.fullName,
        relatedAuditId: uploadForm.relatedAuditId || undefined,
        relatedFindingId: uploadForm.relatedFindingId || undefined,
      },
      currentUser.fullName
    );

    setShowUploadModal(false);
    triggerDataRefresh();
    setUploadForm({
      name: '',
      revision: 'Rev 1.0',
      confidentiality: 'Internal',
      relatedAuditId: '',
      relatedFindingId: '',
      description: '',
      fileDataBase64: '',
      fileSize: 0,
      fileType: 'pdf',
      mimeType: 'application/pdf',
    });
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('Delete this objective evidence document?')) {
      DbService.deleteDocument(id, currentUser.fullName);
      triggerDataRefresh();
    }
  };

  const handleDownloadDoc = (doc: DocumentEvidence) => {
    if (!doc.fileDataBase64) {
      alert(`Simulated demo evidence document: ${doc.name} (stored in local database repository)`);
      return;
    }
    const a = document.createElement('a');
    a.href = doc.fileDataBase64;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            Documents & Objective Evidence Repository
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Store and cross-reference P&IDs, calibration certificates, MOC approvals, and inspection photos.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Evidence</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/60 p-3 rounded border border-slate-800 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by filename, owner, or description..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-slate-400">
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Formats</option>
            <option value="pdf">PDF Documents</option>
            <option value="image">Images / Photos</option>
            <option value="excel">Excel Spreadsheets</option>
            <option value="word">Word Reports</option>
          </select>

          <div className="flex items-center gap-1 text-slate-400 ml-2">
            <span>Audit:</span>
          </div>
          <select
            value={selectedAuditFilter}
            onChange={(e) => setSelectedAuditFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none focus:border-amber-500 max-w-44 truncate"
          >
            <option value="All">All Audits</option>
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                {a.auditNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Document Name</th>
                <th className="py-2.5 px-4">Type & Revision</th>
                <th className="py-2.5 px-4">Related Audit / Finding</th>
                <th className="py-2.5 px-4">Confidentiality</th>
                <th className="py-2.5 px-4">Owner & Upload Date</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No documents found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const relatedAudit = audits.find((a) => a.id === doc.relatedAuditId);
                  const relatedFnd = findings.find((f) => f.id === doc.relatedFindingId);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          {doc.fileType === 'pdf' ? (
                            <FileText className="w-4 h-4 text-red-400 shrink-0" />
                          ) : doc.fileType === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{doc.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">{doc.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <span className="uppercase text-slate-300 font-bold">{doc.fileType}</span> · {doc.revision}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {relatedAudit && (
                          <div className="text-amber-400 font-semibold">{relatedAudit.auditNumber}</div>
                        )}
                        {relatedFnd && (
                          <div className="text-red-400">{relatedFnd.findingNumber}</div>
                        )}
                        {!relatedAudit && !relatedFnd && (
                          <span className="text-slate-500">General Repository</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {doc.confidentiality}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        <div className="text-slate-200">{doc.owner}</div>
                        <div className="text-slate-500 font-mono text-[10px]">{doc.uploadedAt.split('T')[0]}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {formatSize(doc.fileSize)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadDoc(doc)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Download / View"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Upload Document */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Upload Objective Evidence File</h2>
            <form onSubmit={handleSaveDocument} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Select File from Device *</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  onChange={handleFilePicked}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Document Name *</label>
                <input
                  type="text"
                  required
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g. Flare_Stack_Purge_Valve_Calibration_Cert.pdf"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Revision</label>
                  <input
                    type="text"
                    value={uploadForm.revision}
                    onChange={(e) => setUploadForm({ ...uploadForm, revision: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Confidentiality</label>
                  <select
                    value={uploadForm.confidentiality}
                    onChange={(e) => setUploadForm({ ...uploadForm, confidentiality: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="Public">Public</option>
                    <option value="Internal">Internal</option>
                    <option value="Confidential">Confidential</option>
                    <option value="Strictly Restricted">Strictly Restricted</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Link to Audit</label>
                  <select
                    value={uploadForm.relatedAuditId}
                    onChange={(e) => setUploadForm({ ...uploadForm, relatedAuditId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="">None</option>
                    {audits.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.auditNumber} - {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Link to Finding</label>
                  <select
                    value={uploadForm.relatedFindingId}
                    onChange={(e) => setUploadForm({ ...uploadForm, relatedFindingId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="">None</option>
                    {findings.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.findingNumber} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Purpose of evidence, equipment serial numbers, or inspection notes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Save & Attach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
