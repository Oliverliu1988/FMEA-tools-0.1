import React, { useRef, useState } from 'react';
import { FmeaProject, FmeaType, StructureNode, FmeaFunction, FmeaFailure, FmeaCause, FmeaAction, ActionPriority } from '../types';
import { Upload, FileJson, AlertCircle, FileSpreadsheet, Plus, Download, X, Check, Eye } from 'lucide-react';
import { calculateAP } from '../constants';

interface Props {
  project: FmeaProject;
  onChange: (project: FmeaProject) => void;
  onImport: (data: { project: FmeaProject, structure: StructureNode[] }) => void;
}

const Step1_Planning: React.FC<Props> = ({ project, onChange, onImport }) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'overwrite' | 'append'>('overwrite');
  
  // Preview State
  const [previewData, setPreviewData] = useState<{ nodes: StructureNode[], stats: { items: number, funcs: number, failures: number, causes: number } } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (field: keyof FmeaProject, value: string) => {
    onChange({ ...project, [field]: value });
  };

  const downloadTemplate = () => {
      const headers = [
          "System Element", 
          "Function", 
          "Requirements", 
          "Failure Mode", 
          "Failure Effect", 
          "S", 
          "Failure Cause", 
          "O", 
          "Prevention Control", 
          "Detection Control", 
          "D"
      ];
      const row1 = ["Electric Motor", "Convert electrical energy to mechanical", "Torque > 50Nm", "Overheating", "Reduced Life", "7", "High Resistance", "3", "Material Cert", "Temp Test", "4"];
      const row2 = ["", "", "", "No Torque", "System Stop", "8", "Broken Shaft", "2", "Design Calc", "Visual Insp", "3"];
      
      const csvContent = [
          headers.join(","),
          row1.join(","),
          row2.join(",")
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "FMEA_Import_Template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.structure) {
            // Simplified JSON import for now, direct confirm
          if (confirm(`Import JSON Data? This will ${importMode === 'overwrite' ? 'overwrite' : 'append to'} current data.`)) {
             let newProject = project;
             if (importMode === 'overwrite' && json.project) {
                 newProject = json.project;
             }
             onImport({ project: newProject, structure: json.structure });
          }
        } else {
          alert("Invalid FMEA JSON format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
      const result = [];
      let start = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
              inQuotes = !inQuotes;
          } else if (line[i] === ',' && !inQuotes) {
              let cell = line.substring(start, i);
              if (cell.startsWith('"') && cell.endsWith('"')) {
                  cell = cell.slice(1, -1);
              }
              result.push(cell.replace(/""/g, '"').trim());
              start = i + 1;
          }
      }
      let lastCell = line.substring(start);
      if (lastCell.startsWith('"') && lastCell.endsWith('"')) {
          lastCell = lastCell.slice(1, -1);
      }
      result.push(lastCell.replace(/""/g, '"').trim());
      return result;
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              
              let dataStartIndex = 0;
              // Detect header row
              if (lines[0].toLowerCase().includes("system element") || lines[0].toLowerCase().includes("structure analysis")) {
                  dataStartIndex = 1;
              }
              // If there's a second header row (common in some exports)
              if (lines.length > 1 && (lines[1].toLowerCase().includes("function") || lines[1].toLowerCase().includes("risk analysis"))) {
                  dataStartIndex = 2;
              }
              
              const newNodes: StructureNode[] = [];
              const getOrCreateNode = (name: string): StructureNode => {
                  let node = newNodes.find(n => n.name === name);
                  if (!node) {
                      node = { id: crypto.randomUUID(), parentId: null, name, type: 'component', children: [], functions: [] };
                      newNodes.push(node);
                  }
                  return node;
              };

              let lastNode: StructureNode | null = null;
              let lastFunc: FmeaFunction | null = null;
              let lastFail: FmeaFailure | null = null;
              let counts = { items: 0, funcs: 0, failures: 0, causes: 0 };

              for (let i = dataStartIndex; i < lines.length; i++) {
                  const cols = parseCSVLine(lines[i]);
                  if (cols.length < 2) continue; 

                  // Map columns
                  let nodeName = cols[0];
                  let funcDesc = cols[1];
                  let req = cols[2];
                  let failMode = cols[3];
                  let effect = cols[4];
                  let severity = parseInt(cols[5]) || 0;
                  let causeDesc = cols[6];
                  let occ = parseInt(cols[7]) || 0;
                  let prev = cols[8];
                  let detCtrl = cols[9];
                  let det = parseInt(cols[10]) || 0;

                  // Handle "Same as above" logic (Empty string or " symbol)
                  if ((!nodeName || nodeName === '"') && lastNode) nodeName = lastNode.name;
                  if (!nodeName) continue; // Skip if we can't determine a node

                  const node = getOrCreateNode(nodeName);
                  if (node !== lastNode) counts.items++;
                  lastNode = node;

                  if ((!funcDesc || funcDesc === '"') && lastFunc && lastFunc.nodeId === node.id) funcDesc = lastFunc.description;
                  if (!funcDesc) continue;
                  
                  let func = node.functions.find(f => f.description === funcDesc);
                  if (!func) {
                      func = { id: crypto.randomUUID(), nodeId: node.id, description: funcDesc, requirements: req && req !== '"' ? req : "", failures: [] };
                      node.functions.push(func);
                      counts.funcs++;
                  }
                  lastFunc = func;

                  if ((!failMode || failMode === '"') && lastFail && lastFail.functionId === func.id) failMode = lastFail.failureMode;
                  if (!failMode) continue;

                  let fail = func.failures.find(f => f.failureMode === failMode);
                  if (!fail) {
                      fail = { id: crypto.randomUUID(), functionId: func.id, failureMode: failMode, failureEffects: effect && effect !== '"' ? [effect] : [], failureCauses: [] };
                      func.failures.push(fail);
                      counts.failures++;
                  } else {
                      // Merge effects
                      if (effect && effect !== '"' && !fail.failureEffects.includes(effect)) {
                          fail.failureEffects.push(effect);
                      }
                  }
                  lastFail = fail;

                  if (causeDesc && causeDesc !== '"' && causeDesc !== 'None') {
                       let cause = fail.failureCauses.find(c => c.description === causeDesc);
                       if (!cause) {
                           cause = {
                               id: crypto.randomUUID(),
                               failureId: fail.id,
                               description: causeDesc,
                               preventionControl: prev && prev !== '"' ? prev : "",
                               detectionControl: detCtrl && detCtrl !== '"' ? detCtrl : "",
                               severity: severity,
                               occurrence: occ,
                               detection: det,
                               actionPriority: calculateAP(severity, occ, det),
                               actions: []
                           };
                           fail.failureCauses.push(cause);
                           counts.causes++;
                       }
                  }
              }

              if (newNodes.length > 0) {
                  setPreviewData({ nodes: newNodes, stats: counts });
                  setShowPreview(true);
              } else {
                  alert("No valid data structure found in CSV. Please check the template.");
              }

          } catch (err) {
              console.error(err);
              alert("Failed to parse CSV file. Ensure it matches the template format.");
          }
          if (csvInputRef.current) csvInputRef.current.value = "";
      };
      reader.readAsText(file);
  };

  const confirmImport = () => {
      if (previewData) {
          onImport({ project, structure: previewData.nodes });
          setShowPreview(false);
          setPreviewData(null);
          // alert("Import Successful!");
      }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 relative">
      <div className="flex justify-between items-start mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Step 1: Planning & Preparation</h2>
           <p className="text-slate-600">Define the project scope, boundaries, and team. Import Base FMEAs here.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex gap-2 mb-2">
                <button 
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-300 rounded shadow-sm transition-colors text-xs font-medium"
                    title="Download CSV Template"
                >
                    <Download size={14} /> Template
                </button>

                <input 
                    type="file" 
                    accept=".json" 
                    ref={jsonInputRef} 
                    className="hidden" 
                    onChange={handleJsonImport}
                />
                <button 
                    onClick={() => jsonInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded shadow-sm transition-colors text-sm font-medium"
                >
                    <FileJson size={16} /> Import JSON
                </button>
                
                <input 
                    type="file" 
                    accept=".csv" 
                    ref={csvInputRef} 
                    className="hidden" 
                    onChange={handleCSVImport}
                />
                <button 
                    onClick={() => csvInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 rounded shadow-sm transition-colors text-sm font-medium"
                >
                    <FileSpreadsheet size={16} /> Import CSV
                </button>
           </div>
           <div className="flex items-center gap-2 text-xs text-slate-500">
                <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="mode" checked={importMode === 'overwrite'} onChange={() => setImportMode('overwrite')} />
                    Overwrite Data
                </label>
           </div>
        </div>
      </div>
      
      {/* Project Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
          <input 
            type="text" 
            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={project.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Number</label>
          <input 
            type="text" 
            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={project.number}
            onChange={(e) => handleChange('number', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">FMEA Type</label>
          <select 
            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={project.type}
            onChange={(e) => handleChange('type', e.target.value as FmeaType)}
          >
            <option value={FmeaType.DFMEA}>DFMEA (Design)</option>
            <option value={FmeaType.PFMEA}>PFMEA (Process)</option>
            <option value={FmeaType.FMEA_MSR}>FMEA-MSR (Monitor & System Response)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project Manager</label>
          <input 
            type="text" 
            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={project.manager}
            onChange={(e) => handleChange('manager', e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Core Team Members</label>
          <input 
            type="text" 
            placeholder="e.g. John Doe (Design), Jane Smith (Quality)..."
            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={project.teamMembers}
            onChange={(e) => handleChange('teamMembers', e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Scope / Analysis Boundaries</label>
          <textarea 
            rows={4}
            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={project.scope}
            onChange={(e) => handleChange('scope', e.target.value)}
            placeholder="Describe what is included and excluded in this analysis..."
          />
        </div>
      </div>

      {/* Import Preview Modal */}
      {showPreview && previewData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
              <div className="bg-white rounded-xl shadow-2xl w-3/4 max-h-[80%] flex flex-col border border-slate-200">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Eye size={20} className="text-blue-500"/> Import Preview
                      </h3>
                      <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="bg-blue-50 p-3 rounded text-center">
                              <div className="text-2xl font-bold text-blue-600">{previewData.stats.items}</div>
                              <div className="text-xs text-blue-800 uppercase tracking-wide">System Elements</div>
                          </div>
                          <div className="bg-indigo-50 p-3 rounded text-center">
                              <div className="text-2xl font-bold text-indigo-600">{previewData.stats.funcs}</div>
                              <div className="text-xs text-indigo-800 uppercase tracking-wide">Functions</div>
                          </div>
                          <div className="bg-orange-50 p-3 rounded text-center">
                              <div className="text-2xl font-bold text-orange-600">{previewData.stats.failures}</div>
                              <div className="text-xs text-orange-800 uppercase tracking-wide">Failure Modes</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded text-center">
                              <div className="text-2xl font-bold text-red-600">{previewData.stats.causes}</div>
                              <div className="text-xs text-red-800 uppercase tracking-wide">Causes</div>
                          </div>
                      </div>

                      <h4 className="font-bold text-sm text-slate-700 mb-2">Structure Preview (First 5 Items)</h4>
                      <div className="border rounded-lg overflow-hidden text-sm">
                          <table className="w-full text-left">
                              <thead className="bg-slate-100 text-xs text-slate-500 uppercase">
                                  <tr>
                                      <th className="p-2">Element</th>
                                      <th className="p-2">Function</th>
                                      <th className="p-2">Fail Mode</th>
                                      <th className="p-2">Cause</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {previewData.nodes.slice(0, 5).map(node => {
                                      const func = node.functions[0];
                                      const fail = func?.failures[0];
                                      const cause = fail?.failureCauses[0];
                                      return (
                                          <tr key={node.id}>
                                              <td className="p-2 font-medium">{node.name}</td>
                                              <td className="p-2 text-slate-600 truncate max-w-[150px]">{func?.description || "-"}</td>
                                              <td className="p-2 text-slate-600 truncate max-w-[150px]">{fail?.failureMode || "-"}</td>
                                              <td className="p-2 text-slate-600 truncate max-w-[150px]">{cause?.description || "-"}</td>
                                          </tr>
                                      )
                                  })}
                              </tbody>
                          </table>
                          {previewData.nodes.length > 5 && (
                              <div className="p-2 text-center text-xs text-slate-400 bg-slate-50">
                                  ... and {previewData.nodes.length - 5} more items
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl bg-slate-50">
                      <button 
                          onClick={() => setShowPreview(false)}
                          className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmImport}
                          className="px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                          <Check size={16} /> Confirm Import
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Step1_Planning;