import React, { useState } from 'react';
import { StructureNode, FmeaFunction, FmeaType } from '../types';
import { suggestFunctions } from '../services/geminiService';
import { Sparkles, Plus, Trash2, Loader2, List } from 'lucide-react';

interface Props {
  structure: StructureNode[];
  updateStructure: (nodes: StructureNode[]) => void;
  type: FmeaType;
}

/**
 * Step 3: Function Analysis
 * Associates "Functions" and "Requirements" with specific nodes in the structure.
 * 
 * CORE LOGIC:
 * - Selects a node ID (`selectedNodeId`).
 * - Finds that node in the `structure` tree.
 * - Modifies the `functions` array of that specific node using `updateNodeFunctions`.
 */
const Step3_Function: React.FC<Props> = ({ structure, updateStructure, type }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper to find node object from ID
  const findNode = (nodes: StructureNode[], id: string): StructureNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const selectedNode = selectedNodeId ? findNode(structure, selectedNodeId) : null;

  // --- CRUD Operations ---

  /**
   * Updates the `functions` array for a specific node ID deep in the tree.
   * Creates a shallow copy of the tree path to trigger React re-renders.
   */
  const updateNodeFunctions = (nodeId: string, functions: FmeaFunction[]) => {
      const updateRecursive = (nodes: StructureNode[]): StructureNode[] => {
          return nodes.map(n => {
              if (n.id === nodeId) return { ...n, functions }; // Update target
              return { ...n, children: updateRecursive(n.children) }; // Traverse children
          });
      };
      updateStructure(updateRecursive(structure));
  };

  const addFunction = () => {
    if (!selectedNode) return;
    const newFunc: FmeaFunction = {
        id: crypto.randomUUID(),
        nodeId: selectedNode.id,
        description: "",
        requirements: "",
        failures: []
    };
    updateNodeFunctions(selectedNode.id, [...selectedNode.functions, newFunc]);
  };

  /**
   * Deletes a function.
   * CRITICAL: Uses e.preventDefault/stopPropagation to avoid UI glitches.
   */
  const removeFunction = (funcId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!selectedNode) return;
      
      if (confirm("Delete this function and all associated failures?")) {
          const updated = selectedNode.functions.filter(f => f.id !== funcId);
          updateNodeFunctions(selectedNode.id, updated);
      }
  };

  const updateFunctionField = (funcId: string, field: keyof FmeaFunction, value: string) => {
    if (!selectedNode) return;
    const updated = selectedNode.functions.map(f => f.id === funcId ? { ...f, [field]: value } : f);
    updateNodeFunctions(selectedNode.id, updated);
  };

  // --- AI Logic ---
  const handleAISuggest = async () => {
      if (!selectedNode) return;
      setLoading(true);
      try {
          const suggestions = await suggestFunctions(selectedNode.name, type);
          const newFuncs: FmeaFunction[] = suggestions.map((s: any) => ({
              id: crypto.randomUUID(),
              nodeId: selectedNode.id,
              description: s.description,
              requirements: s.requirements,
              failures: []
          }));
          updateNodeFunctions(selectedNode.id, [...selectedNode.functions, ...newFuncs]);
      } catch(e) {
          console.error(e);
          alert("AI Error");
      } finally {
          setLoading(false);
      }
  };

  // --- Render Helpers ---
  const renderSelectionTree = (nodes: StructureNode[], depth = 0) => {
      return nodes.map(node => (
          <div key={node.id} className="ml-2">
              <button 
                onClick={() => setSelectedNodeId(node.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-1 truncate transition-colors
                    ${selectedNodeId === node.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}
                `}
                style={{ marginLeft: `${depth * 10}px`}}
              >
                  {node.name}
              </button>
              {node.children.length > 0 && renderSelectionTree(node.children, depth + 1)}
          </div>
      ));
  };

  return (
    <div className="flex h-[600px] gap-6 p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Left: Structure Selector */}
        <div className="w-1/3 border-r border-slate-200 pr-4 overflow-y-auto scrollbar-thin">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <List size={20}/> Structure Elements
            </h3>
            {structure.length === 0 ? <p className="text-sm text-slate-400">Go to Step 2 to add structure.</p> : renderSelectionTree(structure)}
        </div>

        {/* Right: Function Editor */}
        <div className="w-2/3 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Step 3: Function Analysis</h2>
                    <p className="text-slate-600 h-6 truncate">
                        {selectedNode ? `Functions for: ${selectedNode.name}` : 'Select an element to edit functions'}
                    </p>
                </div>
                 {selectedNode && (
                    <div className="flex gap-2">
                         <button onClick={addFunction} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm transition-colors">
                             <Plus size={14}/> Add Function
                         </button>
                         <button onClick={handleAISuggest} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm disabled:opacity-50 transition-colors">
                            {loading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} />} AI Suggest
                         </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
                {!selectedNode ? (
                    <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded border border-dashed border-slate-300">
                        Select a structure element from the left
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedNode.functions.length === 0 && (
                            <p className="text-center text-slate-400 py-8 italic">No functions defined yet.</p>
                        )}
                        {selectedNode.functions.map((func, idx) => (
                            <div key={func.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow bg-slate-50 group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Function {idx + 1}</span>
                                    <button 
                                        type="button"
                                        onClick={(e) => removeFunction(func.id, e)} 
                                        className="text-slate-300 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Delete Function"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Function Description</label>
                                        <textarea 
                                            value={func.description}
                                            onChange={(e) => updateFunctionField(func.id, 'description', e.target.value)}
                                            className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                            rows={2}
                                            placeholder="What does this item do?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Requirements / Specifications</label>
                                        <input 
                                            value={func.requirements}
                                            onChange={(e) => updateFunctionField(func.id, 'requirements', e.target.value)}
                                            className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                            placeholder="e.g., 12V +/- 0.5V, Max 50 degrees..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Step3_Function;