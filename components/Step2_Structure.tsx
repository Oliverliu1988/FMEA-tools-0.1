import React, { useState } from 'react';
import { StructureNode, FmeaType } from '../types';
import { suggestStructure } from '../services/geminiService';
import { Plus, Trash2, ChevronRight, ChevronDown, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  data: StructureNode[];
  setData: (data: StructureNode[]) => void;
  scope: string;
  type: FmeaType;
}

/**
 * Step 2: Structure Analysis
 * Visualizes and manages the hierarchical tree of the system/process.
 * 
 * CORE LOGIC:
 * - Uses recursive functions to Add, Delete, or Update nodes deep within the tree.
 * - The `setData` prop updates the central state in App.tsx.
 */
const Step2_Structure: React.FC<Props> = ({ data, setData, scope, type }) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "root": true });

  // --- UI Helpers ---
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- CRUD Operations ---

  /**
   * adds a new node. If parentId is null, adds to root.
   * Otherwise, traverses tree to find parent.
   */
  const addNode = (parentId: string | null) => {
    const newNode: StructureNode = {
      id: crypto.randomUUID(),
      parentId,
      name: "New Item",
      type: parentId ? 'component' : 'system',
      children: [],
      functions: []
    };

    if (!parentId) {
      setData([...data, newNode]);
    } else {
      const updated = addNodeRecursive(data, parentId, newNode);
      setData(updated);
      setExpanded(prev => ({ ...prev, [parentId]: true }));
    }
  };

  // Recursive helper to find parent and append child
  const addNodeRecursive = (nodes: StructureNode[], targetId: string, newNode: StructureNode): StructureNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return { ...node, children: [...node.children, newNode] };
      }
      if (node.children.length > 0) {
        return { ...node, children: addNodeRecursive(node.children, targetId, newNode) };
      }
      return node;
    });
  };

  /**
   * Deletes a node and ALL its children/content.
   * Uses filter() recursively to remove the target ID.
   */
  const deleteNode = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Stop form submission behavior
    e.stopPropagation(); // Stop bubbling to parent click handlers
    
    if (confirm("Are you sure? This will delete all children, functions, and failures associated with this item.")) {
       const deleteRecursive = (nodes: StructureNode[]): StructureNode[] => {
           // If the current level contains the ID, filter it out.
           // Then map over remaining nodes to recurse into their children.
           return nodes
             .filter(n => n.id !== id)
             .map(n => ({
               ...n,
               children: deleteRecursive(n.children)
           }));
       };
       setData(deleteRecursive(data));
    }
  };

  // Update the name of a node
  const updateNodeName = (id: string, name: string) => {
      const updateRecursive = (nodes: StructureNode[]): StructureNode[] => {
          return nodes.map(n => {
              if (n.id === id) return { ...n, name };
              return { ...n, children: updateRecursive(n.children) };
          });
      };
      setData(updateRecursive(data));
  };

  // --- AI Logic ---
  const handleAISuggest = async () => {
      if (!scope) {
          alert("Please define the scope in Step 1 first.");
          return;
      }
      setLoading(true);
      try {
          const suggestions = await suggestStructure(scope, type);
          if (suggestions && Array.isArray(suggestions)) {
              if (data.length === 0) {
                  // If tree is empty, create a root based on scope
                  const root: StructureNode = {
                       id: crypto.randomUUID(),
                       parentId: null,
                       name: scope || "Root System",
                       type: 'system',
                       children: suggestions.map(s => ({
                           id: crypto.randomUUID(),
                           parentId: null,
                           name: s,
                           type: 'component',
                           children: [],
                           functions: []
                       })),
                       functions: []
                  };
                  setData([root]);
                  setExpanded({ [root.id]: true });
              } else {
                  // If tree exists, append suggestions to the first root item
                  const rootId = data[0].id;
                  const newChildren = suggestions.map(s => ({
                    id: crypto.randomUUID(),
                    parentId: rootId,
                    name: s,
                    type: 'component' as const,
                    children: [],
                    functions: []
                  }));
                  
                  // Optimistic update
                  const newRoot = { ...data[0], children: [...data[0].children, ...newChildren] };
                  setData([newRoot, ...data.slice(1)]);
              }
          }
      } catch (e) {
          console.error(e);
          alert("Failed to get AI suggestions. check API Key.");
      } finally {
          setLoading(false);
      }
  };

  // --- Render Recursive Tree ---
  const renderTree = (nodes: StructureNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="ml-4 border-l border-slate-300 pl-4 my-2">
        <div className="flex items-center gap-2 group">
            {/* Expand/Collapse Toggle */}
            <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} 
                className="text-slate-500 hover:text-blue-600 w-5 h-5 flex items-center justify-center"
            >
                {node.children.length > 0 ? (
                    expanded[node.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>
                ) : <span className="w-4 h-4 block"></span>}
            </button>

            {/* Editable Node Row */}
            <div className={`flex-1 flex items-center gap-2 p-2 rounded hover:bg-slate-50 border transition-colors ${depth === 0 ? 'border-blue-200 bg-blue-50' : 'border-transparent'}`}>
                <input 
                    value={node.name}
                    onChange={(e) => updateNodeName(node.id, e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full outline-none"
                    placeholder="Item Name"
                />
                
                {/* Actions (Add Child / Delete) */}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); addNode(node.id); }} 
                        title="Add Child" 
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                        <Plus size={14} />
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => deleteNode(node.id, e)} 
                        title="Delete Item" 
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
        
        {/* Children Render */}
        {expanded[node.id] && node.children.length > 0 && (
            <div>
                {renderTree(node.children, depth + 1)}
            </div>
        )}
      </div>
    ));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 min-h-[500px]">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Step 2: Structure Analysis</h2>
                <p className="text-slate-600">Build the visual model of your system, subsystem, and components (or process steps).</p>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={() => addNode(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                >
                    <Plus size={16} /> Add Root Item
                </button>
                <button 
                    onClick={handleAISuggest}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}
                    AI Suggest Structure
                </button>
            </div>
        </div>

        <div className="border border-slate-200 rounded p-4 bg-slate-50">
            {data.length === 0 ? (
                <div className="text-center text-slate-400 py-10">
                    No structure defined. Add a root item or use AI suggestions.
                </div>
            ) : renderTree(data)}
        </div>
    </div>
  );
};

export default Step2_Structure;