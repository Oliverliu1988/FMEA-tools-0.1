import React, { useState } from 'react';
import { StructureNode, FmeaFunction, FmeaFailure, FmeaType } from '../types';
import { suggestFailures, suggestRiskAnalysis } from '../services/geminiService';
import { Sparkles, Plus, Trash2, Loader2, AlertTriangle, Link, ArrowRight } from 'lucide-react';
import { ActionPriority } from '../types';

interface Props {
  structure: StructureNode[];
  updateStructure: (nodes: StructureNode[]) => void;
  type: FmeaType;
}

const Step4_Failure: React.FC<Props> = ({ structure, updateStructure, type }) => {
  const [selectedFuncId, setSelectedFuncId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingRisk, setAnalyzingRisk] = useState<string | null>(null);

  // Flatten functions for easier selection menu (simplified for UX)
  const getAllFunctions = (nodes: StructureNode[]): { func: FmeaFunction, nodeName: string }[] => {
      let list: { func: FmeaFunction, nodeName: string }[] = [];
      nodes.forEach(node => {
          node.functions.forEach(f => list.push({ func: f, nodeName: node.name }));
          list = [...list, ...getAllFunctions(node.children)];
      });
      return list;
  };
  const allFunctions = getAllFunctions(structure);
  const selectedFunctionObj = allFunctions.find(f => f.func.id === selectedFuncId);

  const updateFunctionFailures = (funcId: string, failures: FmeaFailure[]) => {
      // Deep update structure
      const updateRecursive = (nodes: StructureNode[]): StructureNode[] => {
          return nodes.map(n => {
              const updatedFuncs = n.functions.map(f => f.id === funcId ? { ...f, failures } : f);
              return { ...n, functions: updatedFuncs, children: updateRecursive(n.children) };
          });
      };
      updateStructure(updateRecursive(structure));
  };

  const addFailureMode = () => {
      if (!selectedFuncId) return;
      const newFailure: FmeaFailure = {
          id: crypto.randomUUID(),
          functionId: selectedFuncId,
          failureMode: "",
          failureEffects: [],
          failureCauses: []
      };
      const currentFailures = selectedFunctionObj?.func.failures || [];
      updateFunctionFailures(selectedFuncId, [...currentFailures, newFailure]);
  };

  const updateFailure = (failureId: string, field: keyof FmeaFailure, value: any) => {
      if (!selectedFunctionObj) return;
      const updated = selectedFunctionObj.func.failures.map(f => f.id === failureId ? { ...f, [field]: value } : f);
      updateFunctionFailures(selectedFunctionObj.func.id, updated);
  };

  // Sub-editor for Causes (which creates the chain)
  const addCause = (failure: FmeaFailure) => {
      const newCause = {
          id: crypto.randomUUID(),
          failureId: failure.id,
          description: "New Cause",
          preventionControl: "",
          detectionControl: "",
          severity: 0,
          occurrence: 0,
          detection: 0,
          actionPriority: ActionPriority.LOW,
          actions: []
      };
      updateFailure(failure.id, 'failureCauses', [...failure.failureCauses, newCause]);
  };

   const handleAISuggest = async () => {
      if (!selectedFunctionObj) return;
      setLoading(true);
      try {
          const suggestions = await suggestFailures(selectedFunctionObj.func.description, type);
          const newFailures = suggestions.map((s: string) => ({
              id: crypto.randomUUID(),
              functionId: selectedFunctionObj.func.id,
              failureMode: s,
              failureEffects: [],
              failureCauses: []
          }));
          updateFunctionFailures(selectedFunctionObj.func.id, [...selectedFunctionObj.func.failures, ...newFailures]);
      } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeepAnalysis = async (failure: FmeaFailure) => {
      setAnalyzingRisk(failure.id);
      try {
          const result = await suggestRiskAnalysis(failure.failureMode, type);
          if (result) {
              // Update Effect
              const updatedEffects = [...failure.failureEffects, result.effect];
              
              // Create a Cause with controls
              const newCause = {
                id: crypto.randomUUID(),
                failureId: failure.id,
                description: result.cause || "Suggested Cause",
                preventionControl: result.prevention || "",
                detectionControl: result.detection || "",
                severity: 0, // Manual step
                occurrence: 0,
                detection: 0,
                actionPriority: ActionPriority.LOW,
                actions: []
            };

            const updatedFailures = selectedFunctionObj!.func.failures.map(f => {
                if(f.id === failure.id) {
                    return { ...f, failureEffects: updatedEffects, failureCauses: [...f.failureCauses, newCause] };
                }
                return f;
            });
            updateFunctionFailures(selectedFunctionObj!.func.id, updatedFailures);
          }
      } catch(e) { console.error(e); } finally { setAnalyzingRisk(null); }
  };

  return (
    <div className="flex h-[700px] bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Left List */}
        <div className="w-1/4 border-r border-slate-200 bg-slate-50 flex flex-col">
             <div className="p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-700">Functions</h3>
                <p className="text-xs text-slate-500">Select a function to analyze failures</p>
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-1">
                 {allFunctions.map(({func, nodeName}) => (
                     <button 
                        key={func.id}
                        onClick={() => setSelectedFuncId(func.id)}
                        className={`w-full text-left p-3 rounded text-sm transition-all border
                            ${selectedFuncId === func.id ? 'bg-white border-blue-500 shadow-md border-l-4 border-l-blue-600' : 'bg-transparent border-transparent hover:bg-slate-200'}
                        `}
                     >
                         <div className="text-xs font-semibold text-slate-400 mb-1">{nodeName}</div>
                         <div className="font-medium text-slate-800 line-clamp-2">{func.description || "Untitled Function"}</div>
                     </button>
                 ))}
             </div>
        </div>

        {/* Right Editor */}
        <div className="w-3/4 flex flex-col p-6 bg-slate-50/50">
             {!selectedFunctionObj ? (
                 <div className="m-auto text-slate-400 flex flex-col items-center">
                     <AlertTriangle size={48} className="mb-4 opacity-20"/>
                     <p>Select a function from the list to begin Failure Analysis</p>
                 </div>
             ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Step 4: Failure Analysis</h2>
                            <p className="text-sm text-slate-600 max-w-2xl">{selectedFunctionObj.func.description}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={addFailureMode} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm text-sm">
                                <Plus size={16}/> Add Failure Mode
                            </button>
                            <button onClick={handleAISuggest} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm">
                                {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />} Suggest Modes
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin space-y-6 pb-20">
                        {selectedFunctionObj.func.failures.length === 0 && (
                            <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                                No failure modes identified.
                            </div>
                        )}
                        {selectedFunctionObj.func.failures.map((failure, idx) => (
                            <div key={failure.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <span className="font-bold text-slate-700 flex items-center gap-2">
                                        <span className="bg-slate-300 text-slate-700 text-xs px-2 py-0.5 rounded">FM-{idx+1}</span>
                                        Failure Mode
                                    </span>
                                    <div className="flex gap-2">
                                         <button 
                                            onClick={() => handleDeepAnalysis(failure)}
                                            disabled={analyzingRisk === failure.id}
                                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium px-2 py-1 bg-purple-50 rounded"
                                         >
                                            {analyzingRisk === failure.id ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                                            Auto-Fill Chain
                                         </button>
                                         <button onClick={() => {
                                             const newF = selectedFunctionObj.func.failures.filter(f => f.id !== failure.id);
                                             updateFunctionFailures(selectedFunctionObj.func.id, newF);
                                         }} className="text-slate-400 hover:text-red-500">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-4 grid grid-cols-1 gap-4">
                                    {/* Failure Mode Input */}
                                    <input 
                                        value={failure.failureMode}
                                        onChange={(e) => updateFailure(failure.id, 'failureMode', e.target.value)}
                                        className="w-full text-lg font-medium border-b border-slate-200 focus:border-blue-500 outline-none pb-1"
                                        placeholder="Enter Failure Mode (e.g. Cracked Housing)..."
                                    />

                                    <div className="grid grid-cols-2 gap-6 mt-2">
                                        {/* Effects Column */}
                                        <div className="bg-red-50 p-3 rounded border border-red-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide">Failure Effects (Next Level)</h4>
                                                <button 
                                                    onClick={() => updateFailure(failure.id, 'failureEffects', [...failure.failureEffects, ""])}
                                                    className="text-red-600 hover:bg-red-100 p-1 rounded"
                                                ><Plus size={14}/></button>
                                            </div>
                                            <div className="space-y-2">
                                                {failure.failureEffects.map((effect, eIdx) => (
                                                    <div key={eIdx} className="flex gap-2">
                                                        <ArrowRight size={14} className="mt-2 text-red-300 flex-shrink-0"/>
                                                        <textarea 
                                                            value={effect}
                                                            onChange={(e) => {
                                                                const newEffects = [...failure.failureEffects];
                                                                newEffects[eIdx] = e.target.value;
                                                                updateFailure(failure.id, 'failureEffects', newEffects);
                                                            }}
                                                            className="w-full text-sm p-2 border border-red-200 rounded resize-none focus:ring-1 focus:ring-red-300 outline-none"
                                                            rows={2}
                                                            placeholder="Describe effect..."
                                                        />
                                                    </div>
                                                ))}
                                                {failure.failureEffects.length === 0 && <span className="text-xs text-red-300 italic">No effects defined</span>}
                                            </div>
                                        </div>

                                        {/* Causes Column */}
                                        <div className="bg-orange-50 p-3 rounded border border-orange-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wide">Failure Causes (Lower Level)</h4>
                                                <button onClick={() => addCause(failure)} className="text-orange-600 hover:bg-orange-100 p-1 rounded"><Plus size={14}/></button>
                                            </div>
                                             <div className="space-y-2">
                                                {failure.failureCauses.map((cause, cIdx) => (
                                                    <div key={cause.id} className="flex gap-2">
                                                        <Link size={14} className="mt-2 text-orange-300 flex-shrink-0"/>
                                                        <textarea 
                                                            value={cause.description}
                                                            onChange={(e) => {
                                                                const newCauses = [...failure.failureCauses];
                                                                newCauses[cIdx] = { ...cause, description: e.target.value };
                                                                updateFailure(failure.id, 'failureCauses', newCauses);
                                                            }}
                                                            className="w-full text-sm p-2 border border-orange-200 rounded resize-none focus:ring-1 focus:ring-orange-300 outline-none"
                                                            rows={2}
                                                            placeholder="Describe cause..."
                                                        />
                                                    </div>
                                                ))}
                                                {failure.failureCauses.length === 0 && <span className="text-xs text-orange-300 italic">No causes defined</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
             )}
        </div>
    </div>
  );
};

export default Step4_Failure;
