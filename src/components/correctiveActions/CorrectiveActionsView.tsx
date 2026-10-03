import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import {
  CorrectiveAction,
  Finding,
  RootCauseMethod,
  ProcedureLink,
  RiskLink,
  CompetenceLink,
  InsuranceLossPrevention,
} from '../../types/index.ts';
import {
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Save,
  HelpCircle,
  ShieldCheck,
  CheckCheck,
  Clock,
  ArrowRight,
  FileText,
  AlertOctagon,
  Users,
  ShieldAlert,
  Flame,
  DollarSign,
  Plus,
  Trash2,
  ExternalLink,
  FileCheck2,
  Printer,
  ChevronRight,
  Info,
} from 'lucide-react';

export const CorrectiveActionsView: React.FC = () => {
  const {
    selectedFindingId,
    setSelectedFindingId,
    dataVersion,
    triggerDataRefresh,
    currentUser,
    canPerform,
  } = useApp();

  const findings = useMemo(() => DbService.getFindings(), [dataVersion]);

  // Nonconformity findings only
  const ncFindings = useMemo(() => {
    return findings.filter((f) => f.category.includes('Nonconformity'));
  }, [findings]);

  // Current active finding for CAPA
  const currentFinding = useMemo(() => {
    if (selectedFindingId) {
      const match = ncFindings.find((f) => f.id === selectedFindingId);
      if (match) return match;
    }
    return ncFindings[0] || null;
  }, [ncFindings, selectedFindingId]);

  // Active CAPA record from database
  const activeCapa = useMemo(() => {
    if (!currentFinding) return null;
    return DbService.getCorrectiveActionByFindingId(currentFinding.id);
  }, [currentFinding, dataVersion]);

  // Navigation tab for the auditor workflow
  const [activeTab, setActiveTab] = useState<'rootCause' | 'twoTierGates' | 'impactCascade' | 'insurance' | 'dossier'>('twoTierGates');

  // Form State
  const [formData, setFormData] = useState<Partial<CorrectiveAction>>({
    problemStatement: '',
    immediateCorrection: '',
    rootCauseMethod: '5 Why',
    rootCauseDetails: '',
    fiveWhys: ['', '', '', '', ''],
    fishboneJson: {
      manpower: [],
      machine: [],
      method: [],
      material: [],
      measurement: [],
      environment: [],
    },
    correctiveActionPlan: '',
    responsiblePerson: '',
    targetDate: '',
    requiredResources: '',
    completionDate: '',
    evidenceDescription: '',

    // DECISION 1: Implementation
    implementationDecision: 'Pending',
    implementationReviewer: '',
    implementationDate: '',
    implementationEvidence: '',

    // DECISION 2: Effectiveness
    effectivenessDecision: 'Pending',
    effectivenessReviewer: '',
    effectivenessDate: '',
    effectivenessEvidence: '',
    evaluationWindowDays: 60,

    // Enterprise Linkages
    affectedProcedures: [],
    affectedRisks: [],
    affectedCompetencies: [],
    insuranceLossPrevention: {
      exposureCategory: 'Fire & Explosion Hazard',
      financialExposureBracket: 'Severe ($250k-$1M)',
      businessInterruptionRiskDays: 14,
      underwriterWarrantyImpact: true,
      lossControlRecommendation: '',
      underwritingAuditStatus: 'Open Risk Item',
    },

    status: 'Draft',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Quick-add modals state
  const [showAddProcedure, setShowAddProcedure] = useState(false);
  const [newProcedure, setNewProcedure] = useState<Partial<ProcedureLink>>({
    code: '',
    title: '',
    currentRevision: 'Rev 1.0',
    revisionRequired: true,
    targetRevision: 'Rev 2.0',
    status: 'Needs Revision',
    owner: '',
  });

  const [showAddRisk, setShowAddRisk] = useState(false);
  const [newRisk, setNewRisk] = useState<Partial<RiskLink>>({
    riskCode: '',
    riskTitle: '',
    category: 'Operational',
    preLikelihood: 3,
    preConsequence: 4,
    preRiskScore: 12,
    residualLikelihood: 1,
    residualConsequence: 3,
    residualRiskScore: 3,
    riskRegisterUpdated: false,
    reviewedBy: '',
  });

  const [showAddCompetence, setShowAddCompetence] = useState(false);
  const [newCompetence, setNewCompetence] = useState<Partial<CompetenceLink>>({
    targetRoleOrPerson: '',
    requiredCompetency: '',
    gapIdentified: '',
    reTrainingRequired: true,
    trainingDueDate: '',
    signoffStatus: 'Required',
    trainerOrVerifier: '',
  });

  useEffect(() => {
    if (activeCapa) {
      setFormData({
        ...activeCapa,
        fiveWhys: activeCapa.fiveWhys && activeCapa.fiveWhys.length === 5
          ? activeCapa.fiveWhys
          : ['', '', '', '', ''],
        affectedProcedures: activeCapa.affectedProcedures || currentFinding?.affectedProcedures || [],
        affectedRisks: activeCapa.affectedRisks || currentFinding?.affectedRisks || [],
        affectedCompetencies: activeCapa.affectedCompetencies || currentFinding?.affectedCompetencies || [],
        insuranceLossPrevention: activeCapa.insuranceLossPrevention || currentFinding?.insuranceLossPrevention || {
          exposureCategory: 'Asset Physical Damage',
          financialExposureBracket: 'Moderate ($50k-$250k)',
          businessInterruptionRiskDays: 7,
          underwriterWarrantyImpact: false,
          lossControlRecommendation: 'Standard maintenance surveillance.',
          underwritingAuditStatus: 'Open Risk Item',
        },
      });
    } else if (currentFinding) {
      setFormData({
        findingId: currentFinding.id,
        problemStatement: currentFinding.description,
        immediateCorrection: '',
        rootCauseMethod: '5 Why',
        rootCauseDetails: '',
        fiveWhys: ['', '', '', '', ''],
        correctiveActionPlan: '',
        responsiblePerson: currentFinding.responsiblePerson,
        targetDate: currentFinding.dueDate,
        requiredResources: '',
        implementationDecision: 'Pending',
        implementationReviewer: '',
        implementationDate: '',
        implementationEvidence: '',
        effectivenessDecision: 'Pending',
        effectivenessReviewer: '',
        effectivenessDate: '',
        effectivenessEvidence: '',
        evaluationWindowDays: 60,
        affectedProcedures: currentFinding.affectedProcedures || [],
        affectedRisks: currentFinding.affectedRisks || [],
        affectedCompetencies: currentFinding.affectedCompetencies || [],
        insuranceLossPrevention: currentFinding.insuranceLossPrevention || {
          exposureCategory: 'Asset Physical Damage',
          financialExposureBracket: 'Moderate ($50k-$250k)',
          businessInterruptionRiskDays: 7,
          underwriterWarrantyImpact: false,
          lossControlRecommendation: '',
          underwritingAuditStatus: 'Open Risk Item',
        },
        status: 'Draft',
      });
    }
    setIsSaved(false);
  }, [activeCapa, currentFinding]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentFinding) return;

    DbService.saveCorrectiveAction(
      {
        ...formData,
        findingId: currentFinding.id,
      },
      currentUser.fullName
    );

    // Also sync linkages back to the parent finding record so finding views show the updated references
    DbService.saveFinding(
      {
        ...currentFinding,
        affectedProcedures: formData.affectedProcedures,
        affectedRisks: formData.affectedRisks,
        affectedCompetencies: formData.affectedCompetencies,
        insuranceLossPrevention: formData.insuranceLossPrevention,
      },
      currentUser.fullName
    );

    setIsSaved(true);
    setSaveMessage('CAPA and Enterprise Linkages synchronized successfully!');
    triggerDataRefresh();
    setTimeout(() => {
      setIsSaved(false);
      setSaveMessage(null);
    }, 3000);
  };

  const handleFiveWhyChange = (index: number, text: string) => {
    const list = [...(formData.fiveWhys || ['', '', '', '', ''])];
    list[index] = text;
    setFormData({ ...formData, fiveWhys: list });
  };

  const handleFishboneAdd = (category: keyof NonNullable<CorrectiveAction['fishboneJson']>, val: string) => {
    if (!val.trim()) return;
    const current = formData.fishboneJson || {
      manpower: [],
      machine: [],
      method: [],
      material: [],
      measurement: [],
      environment: [],
    };
    const updated = {
      ...current,
      [category]: [...(current[category] || []), val.trim()],
    };
    setFormData({ ...formData, fishboneJson: updated });
  };

  // Decision 1 Validation Sign-off
  const handleSignImplementation = (decision: 'Implemented & Validated' | 'Rejected - Incomplete') => {
    if (!currentFinding) return;
    if (decision === 'Implemented & Validated' && (!formData.implementationEvidence || formData.implementationEvidence.trim().length === 0)) {
      alert('Validation Error: Decision 1 requires specific physical evidence (Work Order #, MOC reference, equipment serial tag, or inspection test report).');
      return;
    }

    const updated: Partial<CorrectiveAction> = {
      ...formData,
      findingId: currentFinding.id,
      implementationDecision: decision,
      implementationReviewer: currentUser.fullName,
      implementationDate: new Date().toISOString().split('T')[0],
      completionDate: formData.completionDate || new Date().toISOString().split('T')[0],
      status: decision === 'Implemented & Validated' ? 'Under Verification' : 'Rejected',
    };

    setFormData(updated);
    DbService.saveCorrectiveAction(updated, currentUser.fullName);
    triggerDataRefresh();
    alert(`Decision 1 Recorded: Action marked as ${decision} by ${currentUser.fullName}.`);
  };

  // Decision 2 Validation Sign-off & Finding Final Closure
  const handleSignEffectivenessAndClose = () => {
    if (!currentFinding) return;

    if (formData.implementationDecision !== 'Implemented & Validated') {
      alert('Decision Gate Blocked: Decision 1 (Physical Implementation) must be validated and certified before Decision 2 (Effectiveness) can be evaluated.');
      return;
    }

    if (!formData.effectivenessEvidence || formData.effectivenessEvidence.trim().length === 0) {
      alert('Validation Error: Decision 2 requires objective proof of sustained effectiveness (e.g. re-audit sample pass, process trend data, zero recurrence verification).');
      return;
    }

    // Save Decision 2 on CAPA
    const updated: Partial<CorrectiveAction> = {
      ...formData,
      findingId: currentFinding.id,
      effectivenessDecision: 'Verified Effective (Sustained)',
      effectivenessReviewer: currentUser.fullName,
      effectivenessDate: new Date().toISOString().split('T')[0],
      closureDecision: 'Effective - Close Finding',
      status: 'Verified Effective',
    };

    setFormData(updated);
    DbService.saveCorrectiveAction(updated, currentUser.fullName);

    // Attempt final closure in database service (which verifies both decisions and warns on procedure/competence gaps)
    const res = DbService.closeFinding(currentFinding.id, currentUser.fullName);
    if (!res.success) {
      alert(`Closure Failed: ${res.message}`);
    } else {
      let msg = `Corrective Action Certified Effective & Finding Closed!`;
      if (res.warnings && res.warnings.length > 0) {
        msg += `\n\nCross-Enterprise Advisory Notices:\n` + res.warnings.join('\n');
      }
      alert(msg);
      triggerDataRefresh();
    }
  };

  // Add Procedure Link Handler
  const handleAddProcedure = () => {
    if (!newProcedure.code || !newProcedure.title) {
      alert('Please provide Procedure Code and Title.');
      return;
    }
    const item: ProcedureLink = {
      id: `prc-${Date.now()}`,
      code: newProcedure.code.trim().toUpperCase(),
      title: newProcedure.title.trim(),
      currentRevision: newProcedure.currentRevision || 'Rev 1.0',
      revisionRequired: Boolean(newProcedure.revisionRequired),
      targetRevision: newProcedure.targetRevision || undefined,
      status: (newProcedure.status as any) || 'Needs Revision',
      owner: newProcedure.owner || 'Process Owner',
    };
    const list = [...(formData.affectedProcedures || []), item];
    setFormData({ ...formData, affectedProcedures: list });
    setShowAddProcedure(false);
    setNewProcedure({
      code: '',
      title: '',
      currentRevision: 'Rev 1.0',
      revisionRequired: true,
      targetRevision: 'Rev 2.0',
      status: 'Needs Revision',
      owner: '',
    });
  };

  // Add Risk Link Handler
  const handleAddRisk = () => {
    if (!newRisk.riskCode || !newRisk.riskTitle) {
      alert('Please provide Risk Code and Title.');
      return;
    }
    const preScore = (newRisk.preLikelihood || 3) * (newRisk.preConsequence || 3);
    const residualScore = (newRisk.residualLikelihood || 1) * (newRisk.residualConsequence || 3);
    const item: RiskLink = {
      id: `rsk-${Date.now()}`,
      riskCode: newRisk.riskCode.trim().toUpperCase(),
      riskTitle: newRisk.riskTitle.trim(),
      category: newRisk.category as any || 'Operational',
      preLikelihood: newRisk.preLikelihood || 3,
      preConsequence: newRisk.preConsequence || 3,
      preRiskScore: preScore,
      residualLikelihood: newRisk.residualLikelihood || 1,
      residualConsequence: newRisk.residualConsequence || 3,
      residualRiskScore: residualScore,
      riskRegisterUpdated: Boolean(newRisk.riskRegisterUpdated),
      reviewedBy: newRisk.reviewedBy || currentUser.fullName,
    };
    const list = [...(formData.affectedRisks || []), item];
    setFormData({ ...formData, affectedRisks: list });
    setShowAddRisk(false);
    setNewRisk({
      riskCode: '',
      riskTitle: '',
      category: 'Operational',
      preLikelihood: 3,
      preConsequence: 4,
      residualLikelihood: 1,
      residualConsequence: 3,
      riskRegisterUpdated: false,
      reviewedBy: '',
    });
  };

  // Add Competence Link Handler
  const handleAddCompetence = () => {
    if (!newCompetence.targetRoleOrPerson || !newCompetence.requiredCompetency) {
      alert('Please specify Target Role/Personnel and Required Competency.');
      return;
    }
    const item: CompetenceLink = {
      id: `cmp-${Date.now()}`,
      targetRoleOrPerson: newCompetence.targetRoleOrPerson.trim(),
      requiredCompetency: newCompetence.requiredCompetency.trim(),
      gapIdentified: newCompetence.gapIdentified || 'Competency re-training required post-finding',
      reTrainingRequired: Boolean(newCompetence.reTrainingRequired),
      trainingDueDate: newCompetence.trainingDueDate || undefined,
      signoffStatus: (newCompetence.signoffStatus as any) || 'Required',
      trainerOrVerifier: newCompetence.trainerOrVerifier || 'Lead Auditor',
    };
    const list = [...(formData.affectedCompetencies || []), item];
    setFormData({ ...formData, affectedCompetencies: list });
    setShowAddCompetence(false);
    setNewCompetence({
      targetRoleOrPerson: '',
      requiredCompetency: '',
      gapIdentified: '',
      reTrainingRequired: true,
      trainingDueDate: '',
      signoffStatus: 'Required',
      trainerOrVerifier: '',
    });
  };

  // Compute "What Else Needs Updating" counts
  const pendingProcedureUpdates = (formData.affectedProcedures || []).filter(
    (p) => p.revisionRequired && (p.status === 'Needs Revision' || p.status === 'In Revision')
  );
  const unupdatedRiskRegisters = (formData.affectedRisks || []).filter(
    (r) => !r.riskRegisterUpdated
  );
  const pendingCompetencyRetraining = (formData.affectedCompetencies || []).filter(
    (c) => c.reTrainingRequired && c.signoffStatus !== 'Completed' && c.signoffStatus !== 'Verified'
  );

  if (!currentFinding) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-12 h-12 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center mb-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">No Open Nonconformities</h2>
        <p className="text-xs text-slate-400 mt-1">All audit checklist items are currently conforming.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Corrective Action & Enterprise Governance (CAPA)
            </h1>
            <span className="font-mono text-xs text-slate-400">
              ISO 9001:10.2 · ISO 14001:10.2 · ISO 45001:10.2
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enforce two-tier independent decision gates (Implementation + Sustained Effectiveness) and integrated enterprise impact cascades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded">
              <CheckCircle className="w-3.5 h-3.5" />
              {saveMessage || 'Saved'}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Nonconformity Selector Carousel / Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Active Nonconformities Requiring CAPA Governance:</span>
          <span>{ncFindings.length} Records</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {ncFindings.map((f) => {
            const isSelected = f.id === currentFinding.id;
            const capa = DbService.getCorrectiveActionByFindingId(f.id);
            const isImp = capa?.implementationDecision === 'Implemented & Validated';
            const isEff = capa?.effectivenessDecision === 'Verified Effective (Sustained)' || f.status === 'Closed';

            return (
              <button
                key={f.id}
                onClick={() => setSelectedFindingId(f.id)}
                className={`flex-shrink-0 text-left p-2.5 rounded border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500/80 shadow-md text-white'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono font-bold text-amber-400">{f.findingNumber}</span>
                  <span className="text-[11px] font-mono text-slate-400">{f.standardCode} §{f.clauseNumber}</span>
                </div>
                <div className="text-xs text-slate-200 font-medium truncate max-w-[220px] mt-0.5">
                  {f.description}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-400">
                  <span>Due: {f.dueDate}</span>
                  <span>·</span>
                  <span className={isImp ? 'text-emerald-400' : 'text-slate-500'}>
                    {isImp ? '✓ Phase 1 Done' : '○ Phase 1 Open'}
                  </span>
                  <span>·</span>
                  <span className={isEff ? 'text-cyan-400' : 'text-slate-500'}>
                    {isEff ? '✓ Phase 2 Done' : '○ Phase 2 Open'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Nonconformity Dossier Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-mono">{currentFinding.findingNumber}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-amber-400 font-medium">{currentFinding.category}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono text-slate-300">{currentFinding.standardCode} Clause {currentFinding.clauseNumber}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-300 font-mono">{currentFinding.department}</span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              {currentFinding.description}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Status:</span>
            <span className={`font-bold ${
              currentFinding.status === 'Closed' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {currentFinding.status}
            </span>
          </div>
        </div>

        {/* Objective Evidence & Clause Requirement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded border border-slate-800/80">
          <div>
            <span className="text-slate-400 font-mono block text-[11px]">Audit Objective Evidence Recorded:</span>
            <p className="text-slate-300 mt-0.5">{currentFinding.objectiveEvidence}</p>
          </div>
          <div>
            <span className="text-slate-400 font-mono block text-[11px]">Mandatory Requirement Breached:</span>
            <p className="text-slate-300 mt-0.5">{currentFinding.requirementText || 'Mandatory standard compliance clause.'}</p>
          </div>
        </div>

        {/* Auditor's "What Else Needs Updating" Live Warning Banner */}
        {(pendingProcedureUpdates.length > 0 || unupdatedRiskRegisters.length > 0 || pendingCompetencyRetraining.length > 0) && (
          <div className="bg-amber-950/30 border border-amber-500/40 p-3 rounded text-xs text-amber-200 flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white font-mono block">
                Cross-System Impact Cascade Notice (Preventing Disconnected Spreadsheet Approvals):
              </strong>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-300/90 font-mono">
                {pendingProcedureUpdates.length > 0 && (
                  <span>📄 {pendingProcedureUpdates.length} Affected Procedure(s) Require Document Revision</span>
                )}
                {unupdatedRiskRegisters.length > 0 && (
                  <span>⚡ {unupdatedRiskRegisters.length} Risk Register Item(s) Pending Residual Score Update</span>
                )}
                {pendingCompetencyRetraining.length > 0 && (
                  <span>👥 {pendingCompetencyRetraining.length} Role(s) Require Documented Competency Retraining</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('twoTierGates')}
          className={`px-3.5 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'twoTierGates'
              ? 'border-amber-400 text-amber-400 bg-amber-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>1. Two-Tier Decision Gates</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">Auditor Core</span>
        </button>

        <button
          onClick={() => setActiveTab('impactCascade')}
          className={`px-3.5 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'impactCascade'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Enterprise Impact Cascade</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
            {(formData.affectedProcedures?.length || 0) + (formData.affectedRisks?.length || 0) + (formData.affectedCompetencies?.length || 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('insurance')}
          className={`px-3.5 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'insurance'
              ? 'border-indigo-400 text-indigo-400 bg-indigo-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>3. Insurance & Loss Prevention</span>
        </button>

        <button
          onClick={() => setActiveTab('rootCause')}
          className={`px-3.5 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'rootCause'
              ? 'border-amber-400 text-amber-400 bg-amber-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>4. Root Cause & CAPA Plan</span>
        </button>

        <button
          onClick={() => setActiveTab('dossier')}
          className={`px-3.5 py-2.5 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'dossier'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>5. Executive Audit Dossier</span>
        </button>
      </div>

      {/* TAB 1: TWO-TIER DECISION GATES (The Auditor's Core Request) */}
      {activeTab === 'twoTierGates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GATE 1: IMPLEMENTATION VALIDATION */}
            <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                    01
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Decision 1: Implementation Validation</h3>
                    <p className="text-[11px] text-slate-400">Has the committed action physically been put in place?</p>
                  </div>
                </div>

                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  formData.implementationDecision === 'Implemented & Validated'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {formData.implementationDecision || 'Pending'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Committed Immediate Correction & Physical Actions:
                  </label>
                  <p className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                    {formData.immediateCorrection || 'Immediate physical correction details.'}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Implementation Physical Evidence Required:
                    <span className="text-amber-400 font-mono text-[10px] ml-1">
                      (Mandatory: Work Order #, calibration certificate, MOC ID, or photograph)
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.implementationEvidence || ''}
                    onChange={(e) => setFormData({ ...formData, implementationEvidence: e.target.value })}
                    placeholder="e.g. Work Order #49021 completed on 2026-03-08; Replacement valve PSV-4102 installed with calibration certificate #BT-2026-081 attached..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Operational Reviewer / Inspector:</label>
                    <input
                      type="text"
                      value={formData.implementationReviewer || ''}
                      onChange={(e) => setFormData({ ...formData, implementationReviewer: e.target.value })}
                      placeholder="e.g. Robert Hayes (Operations Lead)"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Implementation Date:</label>
                    <input
                      type="date"
                      value={formData.implementationDate || ''}
                      onChange={(e) => setFormData({ ...formData, implementationDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Gate 1 Action Controls */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        implementationReviewer: currentUser.fullName,
                        implementationDate: new Date().toISOString().split('T')[0],
                      });
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline font-mono"
                  >
                    Set Me as Reviewer ({currentUser.fullName})
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSignImplementation('Implemented & Validated')}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Certify Implemented</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* GATE 2: SUSTAINED EFFECTIVENESS EVALUATION */}
            <div className={`bg-slate-900 border rounded p-5 space-y-4 shadow-lg ${
              formData.implementationDecision === 'Implemented & Validated'
                ? 'border-slate-800'
                : 'border-slate-800/40 opacity-75'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono font-bold">
                    02
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Decision 2: Sustained Effectiveness Evaluation</h3>
                    <p className="text-[11px] text-slate-400">Has the action proved effective over time in preventing recurrence?</p>
                  </div>
                </div>

                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  formData.effectivenessDecision === 'Verified Effective (Sustained)'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {formData.effectivenessDecision || 'Pending Observation'}
                </span>
              </div>

              {formData.implementationDecision !== 'Implemented & Validated' ? (
                <div className="p-4 bg-slate-950/60 rounded border border-slate-800 text-center space-y-2 my-6">
                  <Clock className="w-6 h-6 text-amber-400 mx-auto" />
                  <h4 className="text-xs font-bold text-white font-mono">Gate 2 Locked: Awaiting Implementation</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Effectiveness cannot be evaluated until Decision 1 (Physical Implementation) has been certified with objective proof.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Evaluation Observation Window:</label>
                      <select
                        value={formData.evaluationWindowDays || 60}
                        onChange={(e) => setFormData({ ...formData, evaluationWindowDays: Number(e.target.value) as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                      >
                        <option value={30}>30 Days Observation</option>
                        <option value={60}>60 Days Observation (Standard)</option>
                        <option value={90}>90 Days Observation (Complex)</option>
                        <option value={120}>120 Days Observation (Turnaround)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Effectiveness Review Date:</label>
                      <input
                        type="date"
                        value={formData.effectivenessDate || ''}
                        onChange={(e) => setFormData({ ...formData, effectivenessDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Objective Evidence of Sustained Effectiveness:
                      <span className="text-cyan-400 font-mono text-[10px] ml-1">
                        (e.g. 60-day run data, re-audit sample pass, zero recurrence check)
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={formData.effectivenessEvidence || ''}
                      onChange={(e) => setFormData({ ...formData, effectivenessEvidence: e.target.value })}
                      placeholder="e.g. Physical walkdown by Lead Auditor on 2026-03-18 verified zero leakage; DCS pressure continuous trend over 60 days confirmed nominal operation; SAP auto-reorder threshold active."
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Lead Auditor / Quality Director Signoff:</label>
                    <input
                      type="text"
                      value={formData.effectivenessReviewer || currentUser.fullName}
                      onChange={(e) => setFormData({ ...formData, effectivenessReviewer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                    />
                  </div>

                  {/* Gate 2 Final Closure Control */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Gate 2 certifies full finding closure
                    </span>

                    <button
                      type="button"
                      onClick={handleSignEffectivenessAndClose}
                      className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Certify Effective & Close Finding</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENTERPRISE IMPACT CASCADE (Procedures, Risks, Competence) */}
      {activeTab === 'impactCascade' && (
        <div className="space-y-6">
          {/* Explanatory Banner */}
          <div className="bg-slate-900/80 border border-slate-800 rounded p-4 text-xs space-y-1">
            <h3 className="text-white font-bold font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Integrated Cross-Enterprise Impact Cascade
            </h3>
            <p className="text-slate-300">
              When a nonconformance occurs, modern audit governance requires updating affected operating procedures, realigning risk registers, and updating competence matrices. This prevents isolated spreadsheet approvals and maintains end-to-end management system integrity.
            </p>
          </div>

          {/* Section A: Affected Standard Operating Procedures (SOPs) */}
          <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  1. Affected Standard Operating Procedures (SOPs / WIs)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProcedure(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 flex items-center gap-1 font-mono"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>Link Procedure</span>
              </button>
            </div>

            {(!formData.affectedProcedures || formData.affectedProcedures.length === 0) ? (
              <div className="text-slate-500 text-xs italic py-2">
                No affected procedures currently linked. Click "Link Procedure" to designate SOPs requiring revision.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-2">Code</th>
                      <th className="p-2">Document Title</th>
                      <th className="p-2">Current Rev</th>
                      <th className="p-2">Target Rev</th>
                      <th className="p-2">Revision Needed?</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Owner</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {formData.affectedProcedures.map((proc, idx) => (
                      <tr key={proc.id || idx} className="hover:bg-slate-800/40">
                        <td className="p-2 font-mono font-bold text-amber-400">{proc.code}</td>
                        <td className="p-2 text-slate-200 font-medium">{proc.title}</td>
                        <td className="p-2 font-mono text-slate-400">{proc.currentRevision}</td>
                        <td className="p-2 font-mono text-cyan-300">{proc.targetRevision || '-'}</td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={proc.revisionRequired}
                            onChange={(e) => {
                              const updated = [...(formData.affectedProcedures || [])];
                              updated[idx] = { ...proc, revisionRequired: e.target.checked };
                              setFormData({ ...formData, affectedProcedures: updated });
                            }}
                            className="rounded bg-slate-950 border-slate-700 text-amber-500"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={proc.status}
                            onChange={(e) => {
                              const updated = [...(formData.affectedProcedures || [])];
                              updated[idx] = { ...proc, status: e.target.value as any };
                              setFormData({ ...formData, affectedProcedures: updated });
                            }}
                            className="bg-slate-950 border border-slate-700 text-xs rounded px-1.5 py-0.5 text-white font-mono"
                          >
                            <option value="Needs Revision">Needs Revision</option>
                            <option value="In Revision">In Revision</option>
                            <option value="Approved">Approved</option>
                            <option value="Current">Current</option>
                          </select>
                        </td>
                        <td className="p-2 text-slate-400 font-mono text-[11px]">{proc.owner}</td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.affectedProcedures?.filter((_, i) => i !== idx);
                              setFormData({ ...formData, affectedProcedures: updated });
                            }}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section B: Affected Enterprise Risk Register */}
          <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  2. Enterprise Risk Register Re-alignment
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRisk(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 flex items-center gap-1 font-mono"
              >
                <Plus className="w-3 h-3 text-red-400" />
                <span>Link Risk Item</span>
              </button>
            </div>

            {(!formData.affectedRisks || formData.affectedRisks.length === 0) ? (
              <div className="text-slate-500 text-xs italic py-2">
                No risk register items linked. Link items to track pre-mitigation vs post-mitigation residual risk scores.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-2">Risk Code</th>
                      <th className="p-2">Risk Scenario</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Pre-CAPA Score</th>
                      <th className="p-2">Post-CAPA Residual</th>
                      <th className="p-2">Register Updated?</th>
                      <th className="p-2">Reviewer</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {formData.affectedRisks.map((risk, idx) => (
                      <tr key={risk.id || idx} className="hover:bg-slate-800/40">
                        <td className="p-2 font-mono font-bold text-red-400">{risk.riskCode}</td>
                        <td className="p-2 text-slate-200 font-medium">{risk.riskTitle}</td>
                        <td className="p-2 font-mono text-slate-400 text-[11px]">{risk.category}</td>
                        <td className="p-2 font-mono">
                          <span className="text-red-400 font-bold">{risk.preRiskScore}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({risk.preLikelihood}×{risk.preConsequence})</span>
                        </td>
                        <td className="p-2 font-mono">
                          <span className="text-emerald-400 font-bold">{risk.residualRiskScore}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({risk.residualLikelihood}×{risk.residualConsequence})</span>
                        </td>
                        <td className="p-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={risk.riskRegisterUpdated}
                              onChange={(e) => {
                                const updated = [...(formData.affectedRisks || [])];
                                updated[idx] = { ...risk, riskRegisterUpdated: e.target.checked };
                                setFormData({ ...formData, affectedRisks: updated });
                              }}
                              className="rounded bg-slate-950 border-slate-700 text-emerald-500"
                            />
                            <span className="text-[11px] font-mono text-slate-300">
                              {risk.riskRegisterUpdated ? 'Updated ✓' : 'Pending'}
                            </span>
                          </label>
                        </td>
                        <td className="p-2 text-slate-400 font-mono text-[11px]">{risk.reviewedBy}</td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.affectedRisks?.filter((_, i) => i !== idx);
                              setFormData({ ...formData, affectedRisks: updated });
                            }}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section C: Competence & Retraining Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  3. Competence & Personnel Retraining Register
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCompetence(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 flex items-center gap-1 font-mono"
              >
                <Plus className="w-3 h-3 text-cyan-400" />
                <span>Link Training Record</span>
              </button>
            </div>

            {(!formData.affectedCompetencies || formData.affectedCompetencies.length === 0) ? (
              <div className="text-slate-500 text-xs italic py-2">
                No competence records linked. Record required operator or contractor training actions.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-2">Target Role / Personnel</th>
                      <th className="p-2">Required Competency</th>
                      <th className="p-2">Gap Identified</th>
                      <th className="p-2">Due Date</th>
                      <th className="p-2">Signoff Status</th>
                      <th className="p-2">Verifier</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {formData.affectedCompetencies.map((comp, idx) => (
                      <tr key={comp.id || idx} className="hover:bg-slate-800/40">
                        <td className="p-2 text-white font-medium">{comp.targetRoleOrPerson}</td>
                        <td className="p-2 text-cyan-300 font-mono">{comp.requiredCompetency}</td>
                        <td className="p-2 text-slate-300 text-[11px]">{comp.gapIdentified}</td>
                        <td className="p-2 font-mono text-slate-400">{comp.trainingDueDate || '-'}</td>
                        <td className="p-2">
                          <select
                            value={comp.signoffStatus}
                            onChange={(e) => {
                              const updated = [...(formData.affectedCompetencies || [])];
                              updated[idx] = { ...comp, signoffStatus: e.target.value as any };
                              setFormData({ ...formData, affectedCompetencies: updated });
                            }}
                            className="bg-slate-950 border border-slate-700 text-xs rounded px-1.5 py-0.5 text-white font-mono"
                          >
                            <option value="Required">Required</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Verified">Verified Competent</option>
                          </select>
                        </td>
                        <td className="p-2 text-slate-400 font-mono text-[11px]">{comp.trainerOrVerifier}</td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.affectedCompetencies?.filter((_, i) => i !== idx);
                              setFormData({ ...formData, affectedCompetencies: updated });
                            }}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INSURANCE & LOSS PREVENTION (External Underwriter Benchmark) */}
      {activeTab === 'insurance' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Property Loss Prevention & Industrial Underwriting Assessment
                </h3>
                <p className="text-[11px] text-slate-400">
                  Benchmarked for external property risk surveyors and industrial insurance underwriters (FM Global, Swiss Re, Allianz Risk Consulting).
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 rounded">
              ALOP & Business Interruption Index
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Loss Prevention Hazard Category:</label>
              <select
                value={formData.insuranceLossPrevention?.exposureCategory || 'Fire & Explosion Hazard'}
                onChange={(e) => {
                  const ins = { ...(formData.insuranceLossPrevention as any), exposureCategory: e.target.value };
                  setFormData({ ...formData, insuranceLossPrevention: ins });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
              >
                <option value="Fire & Explosion Hazard">Fire & Explosion Hazard</option>
                <option value="Business Interruption">Business Interruption (BI)</option>
                <option value="Asset Physical Damage">Asset Physical Damage</option>
                <option value="Environmental Impairment">Environmental Impairment</option>
                <option value="Statutory Liability">Statutory Liability</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Insurable Financial Exposure Bracket:</label>
              <select
                value={formData.insuranceLossPrevention?.financialExposureBracket || 'Severe ($250k-$1M)'}
                onChange={(e) => {
                  const ins = { ...(formData.insuranceLossPrevention as any), financialExposureBracket: e.target.value };
                  setFormData({ ...formData, insuranceLossPrevention: ins });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
              >
                <option value="Negligible (<$10k)">Negligible (&lt;$10k)</option>
                <option value="Low ($10k-$50k)">Low ($10k - $50k)</option>
                <option value="Moderate ($50k-$250k)">Moderate ($50k - $250k)</option>
                <option value="Severe ($250k-$1M)">Severe ($250k - $1M)</option>
                <option value="Catastrophic (>$1M)">Catastrophic (&gt;$1M)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Estimated Downtime Risk (Days):</label>
              <input
                type="number"
                value={formData.insuranceLossPrevention?.businessInterruptionRiskDays || 0}
                onChange={(e) => {
                  const ins = { ...(formData.insuranceLossPrevention as any), businessInterruptionRiskDays: Number(e.target.value) };
                  setFormData({ ...formData, insuranceLossPrevention: ins });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Insurance Surveyor & Loss Control Advisory Notes:
              </label>
              <textarea
                rows={3}
                value={formData.insuranceLossPrevention?.lossControlRecommendation || ''}
                onChange={(e) => {
                  const ins = { ...(formData.insuranceLossPrevention as any), lossControlRecommendation: e.target.value };
                  setFormData({ ...formData, insuranceLossPrevention: ins });
                }}
                placeholder="Recommendations for underwriters to prevent property damage and catastrophic business interruption..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.insuranceLossPrevention?.underwriterWarrantyImpact || false}
                  onChange={(e) => {
                    const ins = { ...(formData.insuranceLossPrevention as any), underwriterWarrantyImpact: e.target.checked };
                    setFormData({ ...formData, insuranceLossPrevention: ins });
                  }}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-500"
                />
                <span className="font-mono text-amber-300">Policy Warranty Impact (Requires Formal Notification to Insurer)</span>
              </label>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Underwriting Endorsement:</span>
                <select
                  value={formData.insuranceLossPrevention?.underwritingAuditStatus || 'Open Risk Item'}
                  onChange={(e) => {
                    const ins = { ...(formData.insuranceLossPrevention as any), underwritingAuditStatus: e.target.value };
                    setFormData({ ...formData, insuranceLossPrevention: ins });
                  }}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                >
                  <option value="Open Risk Item">Open Risk Item</option>
                  <option value="Mitigation Verified">Mitigation Verified</option>
                  <option value="Endorsed by Surveyor">Endorsed by Surveyor</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ROOT CAUSE & CAPA PLAN (5-Why & Fishbone) */}
      {activeTab === 'rootCause' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Root Cause Analysis Methodology (5-Why / Ishikawa Fishbone)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1 text-xs">Immediate Correction (Containment):</label>
                <textarea
                  rows={2}
                  value={formData.immediateCorrection || ''}
                  onChange={(e) => setFormData({ ...formData, immediateCorrection: e.target.value })}
                  placeholder="Immediate containment action executed upon finding discovery..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
                />
              </div>

              {/* 5-Why Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-medium text-xs font-mono">
                  Iterative 5-Why Root Cause Investigation:
                </label>
                {(formData.fiveWhys || ['', '', '', '', '']).map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 w-16 flex-shrink-0">
                      Why #{idx + 1}:
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleFiveWhyChange(idx, e.target.value)}
                      placeholder={`Why ${idx + 1} analysis statement...`}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                ))}
              </div>

              {/* Corrective Action Plan */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 text-xs">
                    Comprehensive Corrective Action Plan (Preventing Systemic Recurrence):
                  </label>
                  <textarea
                    rows={3}
                    value={formData.correctiveActionPlan || ''}
                    onChange={(e) => setFormData({ ...formData, correctiveActionPlan: e.target.value })}
                    placeholder="Specific engineering controls, procedure revisions, ERP updates, and training deployments..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Target Completion Date:</label>
                    <input
                      type="date"
                      value={formData.targetDate || ''}
                      onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Responsible Person:</label>
                    <input
                      type="text"
                      value={formData.responsiblePerson || ''}
                      onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Required Resources & Budget:</label>
                    <input
                      type="text"
                      value={formData.requiredResources || ''}
                      onChange={(e) => setFormData({ ...formData, requiredResources: e.target.value })}
                      placeholder="e.g. $15,000 for replacement valve, SAP configuration"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXECUTIVE AUDIT DOSSIER */}
      {activeTab === 'dossier' && (
        <div className="bg-slate-900 border border-slate-800 rounded p-6 space-y-6 shadow-xl font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                Official ISO & Underwriting Compliance Record
              </span>
              <h2 className="text-base font-bold text-white">
                Nonconformance & CAPA Executive Dossier: {currentFinding.findingNumber}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Finding Details</span>
              <div><strong className="text-slate-300">Category:</strong> {currentFinding.category}</div>
              <div><strong className="text-slate-300">Standard & Clause:</strong> {currentFinding.standardCode} §{currentFinding.clauseNumber}</div>
              <div><strong className="text-slate-300">Department:</strong> {currentFinding.department} ({currentFinding.process})</div>
              <div><strong className="text-slate-300">Identified Date:</strong> {currentFinding.dateIdentified}</div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
              <span className="text-slate-400 font-mono text-[10px] block uppercase">Signoff Decisions Summary</span>
              <div>
                <strong className="text-slate-300">Decision 1 (Implementation):</strong>{' '}
                <span className={formData.implementationDecision === 'Implemented & Validated' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {formData.implementationDecision || 'Pending'}
                </span>
                {formData.implementationReviewer && ` by ${formData.implementationReviewer} on ${formData.implementationDate}`}
              </div>
              <div>
                <strong className="text-slate-300">Decision 2 (Effectiveness):</strong>{' '}
                <span className={formData.effectivenessDecision === 'Verified Effective (Sustained)' ? 'text-cyan-400 font-bold' : 'text-amber-400'}>
                  {formData.effectivenessDecision || 'Pending'}
                </span>
                {formData.effectivenessReviewer && ` by ${formData.effectivenessReviewer} on ${formData.effectivenessDate}`}
              </div>
              <div>
                <strong className="text-slate-300">Observation Window:</strong> {formData.evaluationWindowDays || 60} Days
              </div>
            </div>
          </div>

          {/* Cross-Linkages Summary */}
          <div className="space-y-2 text-xs">
            <span className="text-slate-400 font-mono text-[10px] block uppercase">Traceability Cascade Status</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">📄 Operating Procedures ({formData.affectedProcedures?.length || 0})</span>
                <p className="text-[11px] text-slate-400">
                  {formData.affectedProcedures?.map((p) => p.code).join(', ') || 'No procedures linked'}
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-red-400 font-bold block mb-1">⚡ Risk Register ({formData.affectedRisks?.length || 0})</span>
                <p className="text-[11px] text-slate-400">
                  {formData.affectedRisks?.map((r) => r.riskCode).join(', ') || 'No risks linked'}
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-1">👥 Competence Records ({formData.affectedCompetencies?.length || 0})</span>
                <p className="text-[11px] text-slate-400">
                  {formData.affectedCompetencies?.map((c) => c.targetRoleOrPerson).join(', ') || 'No training linked'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL: PROCEDURE */}
      {showAddProcedure && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Link Affected Procedure (SOP / WI)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Procedure Code *</label>
                <input
                  type="text"
                  placeholder="e.g. SOP-MI-04"
                  value={newProcedure.code}
                  onChange={(e) => setNewProcedure({ ...newProcedure, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Procedure Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Pressure Relief Device Recertification Protocol"
                  value={newProcedure.title}
                  onChange={(e) => setNewProcedure({ ...newProcedure, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Current Revision</label>
                  <input
                    type="text"
                    value={newProcedure.currentRevision}
                    onChange={(e) => setNewProcedure({ ...newProcedure, currentRevision: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Target Revision</label>
                  <input
                    type="text"
                    value={newProcedure.targetRevision || ''}
                    onChange={(e) => setNewProcedure({ ...newProcedure, targetRevision: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Owner / Department</label>
                <input
                  type="text"
                  placeholder="e.g. Mechanical Integrity Lead"
                  value={newProcedure.owner}
                  onChange={(e) => setNewProcedure({ ...newProcedure, owner: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddProcedure(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProcedure}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL: RISK */}
      {showAddRisk && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              Link Risk Register Scenario
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Risk Code *</label>
                <input
                  type="text"
                  placeholder="e.g. RSK-PSM-018"
                  value={newRisk.riskCode}
                  onChange={(e) => setNewRisk({ ...newRisk, riskCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Risk Title / Scenario *</label>
                <input
                  type="text"
                  placeholder="e.g. Loss of primary containment at vessel V-401"
                  value={newRisk.riskTitle}
                  onChange={(e) => setNewRisk({ ...newRisk, riskTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Pre-CAPA Likelihood (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.preLikelihood}
                    onChange={(e) => setNewRisk({ ...newRisk, preLikelihood: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Pre-CAPA Consequence (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.preConsequence}
                    onChange={(e) => setNewRisk({ ...newRisk, preConsequence: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Residual Likelihood (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.residualLikelihood}
                    onChange={(e) => setNewRisk({ ...newRisk, residualLikelihood: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Residual Consequence (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.residualConsequence}
                    onChange={(e) => setNewRisk({ ...newRisk, residualConsequence: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddRisk(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRisk}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-slate-950 font-bold rounded text-xs"
              >
                Add Risk Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL: COMPETENCE */}
      {showAddCompetence && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Link Competency Retraining Record
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Target Role / Individual *</label>
                <input
                  type="text"
                  placeholder="e.g. Hydrocracking Unit Field Operators"
                  value={newCompetence.targetRoleOrPerson}
                  onChange={(e) => setNewCompetence({ ...newCompetence, targetRoleOrPerson: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Required Competency Protocol *</label>
                <input
                  type="text"
                  placeholder="e.g. API 576 Valve Recertification Protocol"
                  value={newCompetence.requiredCompetency}
                  onChange={(e) => setNewCompetence({ ...newCompetence, requiredCompetency: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Specific Gap Identified</label>
                <input
                  type="text"
                  placeholder="e.g. Missed automated SAP lead-time warning trigger"
                  value={newCompetence.gapIdentified}
                  onChange={(e) => setNewCompetence({ ...newCompetence, gapIdentified: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Training Due Date</label>
                  <input
                    type="date"
                    value={newCompetence.trainingDueDate || ''}
                    onChange={(e) => setNewCompetence({ ...newCompetence, trainingDueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Signoff Status</label>
                  <select
                    value={newCompetence.signoffStatus}
                    onChange={(e) => setNewCompetence({ ...newCompetence, signoffStatus: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  >
                    <option value="Required">Required</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Verified">Verified</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddCompetence(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCompetence}
                className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded text-xs"
              >
                Add Competence Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
