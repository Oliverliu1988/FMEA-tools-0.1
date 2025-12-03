import React, { useState } from 'react';
import { FmeaProject, FmeaType, StructureNode } from './types';
import { Layers, GitBranch, Zap, AlertCircle, BarChart2, CheckSquare, FileText, ChevronRight } from 'lucide-react';
import Step1_Planning from './components/Step1_Planning';
import Step2_Structure from './components/Step2_Structure';
import Step3_Function from './components/Step3_Function';
import Step4_Failure from './components/Step4_Failure';
import Step5_Risk from './components/Step5_Risk';
import Step6_Optimization from './components/Step6_Optimization';
import Step7_Results from './components/Step7_Results';

const App = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [project, setProject] = useState<FmeaProject>({
    id: crypto.randomUUID(),
    name: "New Project",
    number: "FMEA-001",
    type: FmeaType.DFMEA,
    manager: "",
    teamMembers: "",
    date: new Date().toISOString().split('T')[0],
    scope: ""
  });
  const [structure, setStructure] = useState<StructureNode[]>([]);

  const handleImport = (data: { project: FmeaProject; structure: StructureNode[] }) => {
    setProject(data.project);
    setStructure(data.structure);
  };

  const steps = [
    { id: 1, title: 'Planning', icon: Layers, component: <Step1_Planning project={project} onChange={setProject} onImport={handleImport} /> },
    { id: 2, title: 'Structure', icon: GitBranch, component: <Step2_Structure data={structure} setData={setStructure} scope={project.scope} type={project.type}/> },
    { id: 3, title: 'Function', icon: Zap, component: <Step3_Function structure={structure} updateStructure={setStructure} type={project.type}/> },
    { id: 4, title: 'Failure', icon: AlertCircle, component: <Step4_Failure structure={structure} updateStructure={setStructure} type={project.type}/> },
    { id: 5, title: 'Risk', icon: BarChart2, component: <Step5_Risk structure={structure} updateStructure={setStructure} /> },
    { id: 6, title: 'Optimization', icon: CheckSquare, component: <Step6_Optimization structure={structure} updateStructure={setStructure} /> },
    { id: 7, title: 'Documentation', icon: FileText, component: <Step7_Results project={project} structure={structure} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white tracking-tight">AIAG-VDA Master</h1>
            <p className="text-xs text-slate-500 mt-1">7-Step FMEA Software</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
            {steps.map(step => (
                <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all relative
                        ${currentStep === step.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}
                    `}
                >
                    <step.icon size={20} />
                    <span>{step.id}. {step.title}</span>
                    {currentStep === step.id && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white" />
                    )}
                </button>
            ))}
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-600 text-center">
            {project.number} - {project.type}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
         {/* Top Header */}
         <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm z-0">
             <div className="flex items-center text-slate-800 font-semibold">
                 <span className="text-slate-400 font-normal mr-2">Current Step:</span> 
                 {steps[currentStep - 1].title}
             </div>
             <div className="flex gap-4">
                 <button 
                    disabled={currentStep === 1}
                    onClick={() => setCurrentStep(p => p - 1)}
                    className="text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-500 font-medium text-sm"
                 >
                     Previous
                 </button>
                 <button 
                    disabled={currentStep === 7}
                    onClick={() => setCurrentStep(p => p + 1)}
                    className="flex items-center gap-1 bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
                 >
                     Next Step <ChevronRight size={14}/>
                 </button>
             </div>
         </header>

         {/* Content View */}
         <main className="flex-1 overflow-y-auto p-8 bg-slate-100">
             <div className="max-w-7xl mx-auto h-full">
                 {steps[currentStep - 1].component}
             </div>
         </main>
      </div>
    </div>
  );
};

export default App;