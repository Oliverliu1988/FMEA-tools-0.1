import React from 'react';
import { StructureNode, FmeaFailure, FmeaCause, ActionPriority } from '../types';
import { SEVERITY_OPTIONS, OCCURRENCE_OPTIONS, DETECTION_OPTIONS, calculateAP } from '../constants';

interface Props {
  structure: StructureNode[];
  updateStructure: (nodes: StructureNode[]) => void;
}

const Step5_Risk: React.FC<Props> = ({ structure, updateStructure }) => {
  // We need to flatten the entire tree into a list of "FMEA Rows" essentially (Cause context)
  // For the UI, we will iterate and display.
  
  const handleScoreChange = (
      nodeId: string, 
      funcId: string, 
      failId: string, 
      causeId: string, 
      field: 'severity' | 'occurrence' | 'detection' | 'preventionControl' | 'detectionControl', 
      value: any
    ) => {
        const updateRecursive = (nodes: StructureNode[]): StructureNode[] => {
            return nodes.map(node => {
                if (node.id === nodeId) {
                    const newFuncs = node.functions.map(func => {
                        if (func.id === funcId) {
                            const newFailures = func.failures.map(fail => {
                                if (fail.id === failId) {
                                    const newCauses = fail.failureCauses.map(cause => {
                                        if (cause.id === causeId) {
                                            const updatedCause = { ...cause, [field]: value };
                                            // Recalculate AP
                                            if (['severity', 'occurrence', 'detection'].includes(field)) {
                                                const s = field === 'severity' ? value : cause.severity;
                                                const o = field === 'occurrence' ? value : cause.occurrence;
                                                const d = field === 'detection' ? value : cause.detection;
                                                updatedCause.actionPriority = calculateAP(Number(s), Number(o), Number(d));
                                                // Severity actually belongs to the Effect theoretically, but mapped to Cause row in worksheet
                                            }
                                            return updatedCause;
                                        }
                                        return cause;
                                    });
                                    return { ...fail, failureCauses: newCauses };
                                }
                                return fail;
                            });
                            return { ...func, failures: newFailures };
                        }
                        return func;
                    });
                    return { ...node, functions: newFuncs };
                }
                return { ...node, children: updateRecursive(node.children) };
            });
        };
        updateStructure(updateRecursive(structure));
  };

  const renderRows = () => {
      const rows: React.ReactElement[] = [];
      
      const traverse = (nodes: StructureNode[]) => {
          nodes.forEach(node => {
              node.functions.forEach(func => {
                  func.failures.forEach(fail => {
                      if (fail.failureCauses.length === 0) return; // Skip if no causes (rows are based on causes)
                      fail.failureCauses.forEach(cause => {
                          rows.push(
                            <tr key={cause.id} className="hover:bg-slate-50 border-b border-slate-100 text-sm">
                                <td className="p-3 border-r max-w-[200px] truncate" title={fail.failureMode}>{fail.failureMode}</td>
                                <td className="p-3 border-r max-w-[200px] truncate text-red-600" title={fail.failureEffects.join(', ')}>{fail.failureEffects.join(', ') || '-'}</td>
                                <td className="p-3 border-r max-w-[200px] truncate text-orange-600" title={cause.description}>{cause.description}</td>
                                
                                {/* Current Controls */}
                                <td className="p-1 border-r">
                                    <textarea 
                                        rows={2} 
                                        className="w-full text-xs p-1 border border-slate-200 rounded" 
                                        placeholder="Prevention..."
                                        value={cause.preventionControl}
                                        onChange={(e) => handleScoreChange(node.id, func.id, fail.id, cause.id, 'preventionControl', e.target.value)}
                                    />
                                </td>
                                <td className="p-1 border-r">
                                    <textarea 
                                        rows={2} 
                                        className="w-full text-xs p-1 border border-slate-200 rounded" 
                                        placeholder="Detection..."
                                        value={cause.detectionControl}
                                        onChange={(e) => handleScoreChange(node.id, func.id, fail.id, cause.id, 'detectionControl', e.target.value)}
                                    />
                                </td>

                                {/* Scoring */}
                                <td className="p-1 border-r bg-red-50 w-16">
                                    <select 
                                        value={cause.severity} 
                                        onChange={(e) => handleScoreChange(node.id, func.id, fail.id, cause.id, 'severity', Number(e.target.value))}
                                        className="w-full bg-transparent text-center font-bold outline-none"
                                        title="Severity"
                                    >
                                        <option value={0}>-</option>
                                        {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                                    </select>
                                </td>
                                <td className="p-1 border-r bg-orange-50 w-16">
                                     <select 
                                        value={cause.occurrence} 
                                        onChange={(e) => handleScoreChange(node.id, func.id, fail.id, cause.id, 'occurrence', Number(e.target.value))}
                                        className="w-full bg-transparent text-center font-bold outline-none"
                                        title="Occurrence"
                                    >
                                        <option value={0}>-</option>
                                        {OCCURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                                    </select>
                                </td>
                                <td className="p-1 border-r bg-blue-50 w-16">
                                    <select 
                                        value={cause.detection} 
                                        onChange={(e) => handleScoreChange(node.id, func.id, fail.id, cause.id, 'detection', Number(e.target.value))}
                                        className="w-full bg-transparent text-center font-bold outline-none"
                                        title="Detection"
                                    >
                                        <option value={0}>-</option>
                                        {DETECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                                    </select>
                                </td>
                                
                                {/* AP Result */}
                                <td className="p-3 font-bold text-center w-16">
                                    <span className={`px-2 py-1 rounded text-white text-xs
                                        ${cause.actionPriority === ActionPriority.HIGH ? 'bg-red-600' : 
                                          cause.actionPriority === ActionPriority.MEDIUM ? 'bg-yellow-500' : 'bg-green-600'}
                                    `}>
                                        {cause.actionPriority}
                                    </span>
                                </td>
                            </tr>
                          );
                      });
                  });
              });
              traverse(node.children);
          });
      };
      
      traverse(structure);
      return rows;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Step 5: Risk Analysis</h2>
        <p className="text-slate-600 mb-6">Assign Severity (S), Occurrence (O), and Detection (D) ratings to calculate Action Priority (AP).</p>

        <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                        <th className="p-3 border-r border-b">Failure Mode</th>
                        <th className="p-3 border-r border-b">Effect</th>
                        <th className="p-3 border-r border-b">Cause</th>
                        <th className="p-3 border-r border-b">Prev. Control</th>
                        <th className="p-3 border-r border-b">Det. Control</th>
                        <th className="p-3 border-r border-b text-center w-16" title="Severity">S</th>
                        <th className="p-3 border-r border-b text-center w-16" title="Occurrence">O</th>
                        <th className="p-3 border-r border-b text-center w-16" title="Detection">D</th>
                        <th className="p-3 border-b text-center w-16" title="Action Priority">AP</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {renderRows()}
                </tbody>
            </table>
            {renderRows().length === 0 && (
                <div className="p-8 text-center text-slate-400 italic">
                    No Failure Causes defined yet. Go back to Step 4.
                </div>
            )}
        </div>
    </div>
  );
};

export default Step5_Risk;