import React, { useRef } from 'react';
import { FmeaProject, FmeaType, StructureNode } from '../types';
import { Upload, FileJson, AlertCircle } from 'lucide-react';

interface Props {
  project: FmeaProject;
  onChange: (project: FmeaProject) => void;
  onImport: (data: { project: FmeaProject, structure: StructureNode[] }) => void;
}

const Step1_Planning: React.FC<Props> = ({ project, onChange, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof FmeaProject, value: string) => {
    onChange({ ...project, [field]: value });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.project && json.structure) {
          if (confirm(`Import Project "${json.project.name}"? This will overwrite current data.`)) {
             onImport(json);
          }
        } else {
          alert("Invalid FMEA file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse file.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Step 1: Planning & Preparation</h2>
           <p className="text-slate-600">Define the project scope, boundaries, and team. Import Base FMEAs here.</p>
        </div>
        <div>
           <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileImport}
           />
           <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded shadow-sm transition-colors text-sm font-medium"
           >
              <Upload size={16} /> Import Base FMEA (JSON)
           </button>
        </div>
      </div>
      
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
      
      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100 flex gap-3">
         <AlertCircle className="text-blue-500 flex-shrink-0" size={20} />
         <div className="text-sm text-blue-800">
            <strong>Tip:</strong> You can start by importing a similar previous FMEA (Base FMEA) using the button above to pre-populate the structure and functions.
         </div>
      </div>
    </div>
  );
};

export default Step1_Planning;