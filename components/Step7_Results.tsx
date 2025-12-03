import React, { useRef } from 'react';
import { StructureNode, FmeaProject } from '../types';
import { Download, FileJson } from 'lucide-react';

interface Props {
  project: FmeaProject;
  structure: StructureNode[];
}

const Step7_Results: React.FC<Props> = ({ project, structure }) => {
    const tableRef = useRef<HTMLTableElement>(null);

    const exportToCSV = () => {
        if (!tableRef.current) return;
        const rows = Array.from(tableRef.current.querySelectorAll("tr")) as HTMLTableRowElement[];
        const csvContent = rows.map(row => {
            const cols = Array.from(row.querySelectorAll("th, td")) as HTMLElement[];
            return cols.map(col => `"${(col.textContent || "").replace(/"/g, '""')}"`).join(",");
        }).join("\n");
        
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${project.name.replace(/\s+/g, '_')}_FMEA.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToJSON = () => {
        const data = {
            project,
            structure
        };
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${project.name.replace(/\s+/g, '_')}_Full_FMEA.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderRows = () => {
      const rows: React.ReactElement[] = [];
      const traverse = (nodes: StructureNode[]) => {
          nodes.forEach(node => {
              node.functions.forEach(func => {
                  func.failures.forEach(fail => {
                      if (fail.failureCauses.length === 0) return;
                      fail.failureCauses.forEach(cause => {
                          const baseRow = (
                              <>
                                <td className="p-2 border border-slate-300">{node.name}</td>
                                <td className="p-2 border border-slate-300">{func.description}</td>
                                <td className="p-2 border border-slate-300">{func.requirements}</td>
                                <td className="p-2 border border-slate-300">{fail.failureMode}</td>
                                <td className="p-2 border border-slate-300">{fail.failureEffects.join('; ')}</td>
                                <td className="p-2 border border-slate-300 text-center">{cause.severity}</td>
                                <td className="p-2 border border-slate-300">{cause.description}</td>
                                <td className="p-2 border border-slate-300 text-center">{cause.occurrence}</td>
                                <td className="p-2 border border-slate-300">{cause.preventionControl}</td>
                                <td className="p-2 border border-slate-300">{cause.detectionControl}</td>
                                <td className="p-2 border border-slate-300 text-center">{cause.detection}</td>
                                <td className="p-2 border border-slate-300 text-center font-bold">{cause.actionPriority}</td>
                              </>
                          );

                          if (cause.actions.length === 0) {
                              rows.push(
                                  <tr key={cause.id}>
                                      {baseRow}
                                      <td className="p-2 border border-slate-300" colSpan={7}>None</td>
                                  </tr>
                              );
                          } else {
                              cause.actions.forEach((action, idx) => {
                                  rows.push(
                                      <tr key={`${cause.id}-${action.id}`}>
                                          {idx === 0 && baseRow} {/* Only show base info on first action row? Or repeat? repeating for CSV safety */}
                                          {idx > 0 && (
                                              <>
                                                <td className="p-2 border border-slate-300 text-slate-300">{node.name}</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                                <td className="p-2 border border-slate-300 text-slate-300">"</td>
                                              </>
                                          )}
                                          <td className="p-2 border border-slate-300">{action.description}</td>
                                          <td className="p-2 border border-slate-300">{action.responsible}</td>
                                          <td className="p-2 border border-slate-300">{action.targetDate}</td>
                                          <td className="p-2 border border-slate-300">{action.takenAction}</td>
                                          <td className="p-2 border border-slate-300 text-center">{action.newSeverity}</td>
                                          <td className="p-2 border border-slate-300 text-center">{action.newOccurrence}</td>
                                          <td className="p-2 border border-slate-300 text-center">{action.newDetection}</td>
                                          <td className="p-2 border border-slate-300 text-center font-bold">{action.newActionPriority}</td>
                                      </tr>
                                  );
                              });
                          }
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
            <div className="flex justify-between items-center mb-6">
                <div>
                     <h2 className="text-2xl font-bold text-slate-800">Step 7: Result Documentation</h2>
                     <p className="text-slate-600">Export your analysis for review and audit.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={exportToJSON}
                        className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 shadow-sm"
                        title="Export full project data to JSON (for backups or importing later)"
                    >
                        <FileJson size={18}/> Export JSON
                    </button>
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow-sm"
                        title="Export to Excel/CSV for reporting"
                    >
                        <Download size={18}/> Export CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-300">
                <table ref={tableRef} className="w-full text-xs whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-200">
                            <th className="p-2 border border-slate-300 text-left" colSpan={3}>Structure Analysis</th>
                            <th className="p-2 border border-slate-300 text-left" colSpan={3}>Failure Analysis</th>
                            <th className="p-2 border border-slate-300 text-left" colSpan={6}>Risk Analysis</th>
                            <th className="p-2 border border-slate-300 text-left" colSpan={7}>Optimization</th>
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                            <th className="p-2 border border-slate-300">System Element</th>
                            <th className="p-2 border border-slate-300">Function</th>
                            <th className="p-2 border border-slate-300">Requirement</th>
                            <th className="p-2 border border-slate-300">Failure Mode</th>
                            <th className="p-2 border border-slate-300">Effect</th>
                            <th className="p-2 border border-slate-300 w-8">S</th>
                            <th className="p-2 border border-slate-300">Cause</th>
                            <th className="p-2 border border-slate-300 w-8">O</th>
                            <th className="p-2 border border-slate-300">Prevention</th>
                            <th className="p-2 border border-slate-300">Detection</th>
                            <th className="p-2 border border-slate-300 w-8">D</th>
                            <th className="p-2 border border-slate-300 w-8">AP</th>
                            <th className="p-2 border border-slate-300">Action</th>
                            <th className="p-2 border border-slate-300">Resp.</th>
                            <th className="p-2 border border-slate-300">Date</th>
                            <th className="p-2 border border-slate-300">Action Taken</th>
                            <th className="p-2 border border-slate-300 w-8">S</th>
                            <th className="p-2 border border-slate-300 w-8">O</th>
                            <th className="p-2 border border-slate-300 w-8">D</th>
                            <th className="p-2 border border-slate-300 w-8">AP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderRows()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Step7_Results;