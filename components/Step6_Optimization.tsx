import React from 'react';
import { StructureNode, FmeaAction, ActionPriority } from '../types';
import { calculateAP } from '../constants';
import { Plus, Trash2, CheckCircle } from 'lucide-react';

interface Props {
  structure: StructureNode[];
  updateStructure: (nodes: StructureNode[]) => void;
}

const Step6_Optimization: React.FC<Props> = ({ structure, updateStructure }) => {

  const addAction = (nodeId: string, funcId: string, failId: string, causeId: string) => {
       const updateRecursive = (nodes: StructureNode[]): StructureNode[] => {
            return nodes.map(node => {
                if(node.id === nodeId) {
                    const newFuncs = node.functions.map(f => {
                         if(f.id === funcId) {
                             const newFails = f.failures.map(fail => {
                                 if(fail.id === failId) {
                                     const newCauses = fail.failureCauses.map(c => {
                                         if(c.id === causeId) {
                                             const newAction: FmeaAction = {
                                                 id: crypto.randomUUID(),
                                                 causeId: c.id,
                                                 description: "",
                                                 responsible: "",
                                                 targetDate: "",
                                                 status: "Open",
                                                 takenAction: "",
                                                 completionDate: "",
                                                 newSeverity: c.severity,
                                                 newOccurrence: c.occurrence,
                                                 newDetection: c.detection,
                                                 newActionPriority: c.actionPriority
                                             };
                                             return { ...c, actions: [...c.actions, newAction] };
                                         }
                                         return c;
                                     });
                                     return { ...fail, failureCauses: newCauses };
                                 }
                                 return fail;
                             });
                             return { ...f, failures: newFails };
                         }
                         return f;
                    });
                    return { ...node, functions: newFuncs };
                }
                return { ...node, children: updateRecursive(node.children) };
            });
       };
       updateStructure(updateRecursive(structure));
  };

  const updateAction = (nodeId: string, funcId: string, failId: string, causeId: string, actionId: string, field: keyof FmeaAction, value: any) => {
      const updateRecursive = (nodes: StructureNode[]): StructureNode[] => {
            return nodes.map(node => {
                if(node.id === nodeId) {
                    return {
                        ...node,
                        functions: node.functions.map(f => {
                            if(f.id !== funcId) return f;
                            return {
                                ...f,
                                failures: f.failures.map(fail => {
                                    if(fail.id !== failId) return fail;
                                    return {
                                        ...fail,
                                        failureCauses: fail.failureCauses.map(c => {
                                            if(c.id !== causeId) return c;
                                            return {
                                                ...c,
                                                actions: c.actions.map(a => {
                                                    if(a.id !== actionId) return a;
                                                    const updated = { ...a, [field]: value };
                                                    // Recalc AP if scores changed
                                                    if(['newSeverity', 'newOccurrence', 'newDetection'].includes(field)) {
                                                        updated.newActionPriority = calculateAP(updated.newSeverity, updated.newOccurrence, updated.newDetection);
                                                    }
                                                    return updated;
                                                })
                                            };
                                        })
                                    };
                                })
                            };
                        })
                    };
                }
                return { ...node, children: updateRecursive(node.children) };
            });
       };
       updateStructure(updateRecursive(structure));
  };

  const renderOptimizationRows = () => {
    const rows: React.ReactElement[] = [];
    const traverse = (nodes: StructureNode[]) => {
        nodes.forEach(node => {
            node.functions.forEach(func => {
                func.failures.forEach(fail => {
                    fail.failureCauses.forEach(cause => {
                        // Only show High/Medium risk items or items with actions
                        if (cause.actionPriority === ActionPriority.LOW && cause.actions.length === 0) return;

                        rows.push(
                            <div key={cause.id} className="mb-6 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                                {/* Header Info */}
                                <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center text-sm">
                                    <div className="flex gap-4">
                                        <span className="font-semibold text-slate-700">Failure: <span className="font-normal text-slate-600">{fail.failureMode}</span></span>
                                        <span className="font-semibold text-slate-700">Cause: <span className="font-normal text-slate-600">{cause.description}</span></span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                         <div className="text-xs text-slate-500">
                                            Current Risk: 
                                            <span className="ml-1 font-mono font-bold text-slate-700">S:{cause.severity} O:{cause.occurrence} D:{cause.detection}</span>
                                            <span className={`ml-2 px-1.5 py-0.5 rounded text-white font-bold ${cause.actionPriority === 'H' ? 'bg-red-600' : cause.actionPriority === 'M' ? 'bg-yellow-500' : 'bg-green-600'}`}>{cause.actionPriority}</span>
                                         </div>
                                         <button 
                                            onClick={() => addAction(node.id, func.id, fail.id, cause.id)}
                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-700"
                                        >
                                            <Plus size={12}/> Add Action
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Actions List */}
                                <div className="p-4 space-y-4">
                                    {cause.actions.length === 0 && <p className="text-sm text-slate-400 italic">No optimization actions defined.</p>}
                                    {cause.actions.map((action, idx) => (
                                        <div key={action.id} className="grid grid-cols-12 gap-4 items-start text-sm border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                                            <div className="col-span-1 flex justify-center pt-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                            </div>
                                            
                                            <div className="col-span-4 space-y-2">
                                                <label className="block text-xs font-bold text-slate-500">Preventive/Detection Action</label>
                                                <textarea 
                                                    value={action.description}
                                                    onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'description', e.target.value)}
                                                    className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-blue-500" rows={2} placeholder="Describe action..."
                                                />
                                                <div className="flex gap-2">
                                                    <input 
                                                        placeholder="Responsible" 
                                                        value={action.responsible}
                                                        onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'responsible', e.target.value)}
                                                        className="w-1/2 border rounded p-1 text-xs"
                                                    />
                                                    <input 
                                                        type="date"
                                                        value={action.targetDate}
                                                        onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'targetDate', e.target.value)}
                                                        className="w-1/2 border rounded p-1 text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-span-4 space-y-2">
                                                <label className="block text-xs font-bold text-slate-500">Action Taken & Evidence</label>
                                                <textarea 
                                                    value={action.takenAction}
                                                    onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'takenAction', e.target.value)}
                                                    className="w-full border rounded p-2 text-sm bg-slate-50 focus:bg-white transition-colors" rows={2} placeholder="What was actually done?"
                                                />
                                                 <div className="flex gap-2 items-center">
                                                    <select 
                                                        value={action.status}
                                                        onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'status', e.target.value)}
                                                        className={`text-xs border rounded p-1 font-bold ${action.status === 'Completed' ? 'text-green-600' : 'text-slate-600'}`}
                                                    >
                                                        <option value="Open">Open</option>
                                                        <option value="Completed">Completed</option>
                                                        <option value="Discarded">Discarded</option>
                                                    </select>
                                                    <input 
                                                        type="date"
                                                        value={action.completionDate}
                                                        onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'completionDate', e.target.value)}
                                                        className="flex-1 border rounded p-1 text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-span-3 bg-green-50 p-2 rounded border border-green-100">
                                                <label className="block text-xs font-bold text-green-700 mb-1 text-center">Re-Rating</label>
                                                <div className="flex justify-between mb-2 px-1">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-slate-500">S</span>
                                                        <input type="number" min="1" max="10" className="w-8 text-center border rounded text-xs" value={action.newSeverity} onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'newSeverity', Number(e.target.value))}/>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-slate-500">O</span>
                                                        <input type="number" min="1" max="10" className="w-8 text-center border rounded text-xs" value={action.newOccurrence} onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'newOccurrence', Number(e.target.value))}/>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-slate-500">D</span>
                                                        <input type="number" min="1" max="10" className="w-8 text-center border rounded text-xs" value={action.newDetection} onChange={(e) => updateAction(node.id, func.id, fail.id, cause.id, action.id, 'newDetection', Number(e.target.value))}/>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                     <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${action.newActionPriority === 'H' ? 'bg-red-600' : action.newActionPriority === 'M' ? 'bg-yellow-500' : 'bg-green-600'}`}>
                                                         AP: {action.newActionPriority}
                                                     </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Step 6: Optimization</h2>
        <p className="text-slate-600 mb-6">Identify actions to mitigate high risks, assign responsibility, and re-evaluate Risk.</p>
        <div>
            {renderOptimizationRows()}
            {renderOptimizationRows().length === 0 && (
                <div className="p-12 text-center text-slate-400">
                    No high risk items identified or no structure present.
                </div>
            )}
        </div>
    </div>
  );
};

export default Step6_Optimization;