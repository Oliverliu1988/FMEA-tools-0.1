export enum FmeaType {
  DFMEA = "DFMEA",
  PFMEA = "PFMEA",
  FMEA_MSR = "FMEA-MSR",
}

export enum ActionPriority {
  LOW = "L",
  MEDIUM = "M",
  HIGH = "H",
}

export interface FmeaProject {
  id: string;
  name: string;
  number: string;
  type: FmeaType;
  manager: string;
  teamMembers: string;
  date: string;
  scope: string;
}

export interface StructureNode {
  id: string;
  parentId: string | null;
  name: string; // Product Item or Process Step
  type: 'system' | 'subsystem' | 'component' | 'process_step' | 'work_element';
  children: StructureNode[];
  functions: FmeaFunction[];
}

export interface FmeaFunction {
  id: string;
  nodeId: string;
  description: string;
  requirements: string; // Specs/Tolerances
  failures: FmeaFailure[];
}

export interface FmeaFailure {
  id: string;
  functionId: string;
  failureMode: string;
  failureEffects: string[]; // Step 4: Effects (Severity linked here)
  failureCauses: FmeaCause[]; // Step 4: Causes (Occurrence linked here)
}

export interface FmeaCause {
  id: string;
  failureId: string;
  description: string;
  preventionControl: string;
  detectionControl: string;
  severity: number; // Inherited from Effect (max)
  occurrence: number;
  detection: number;
  actionPriority: ActionPriority; // Calculated
  actions: FmeaAction[];
}

export interface FmeaAction {
  id: string;
  causeId: string;
  description: string;
  responsible: string;
  targetDate: string;
  status: 'Open' | 'Completed' | 'Discarded';
  takenAction: string;
  completionDate: string;
  newSeverity: number;
  newOccurrence: number;
  newDetection: number;
  newActionPriority: ActionPriority;
}

// Flat structure for the specific "Worksheet" view if needed,
// but the app will work primarily on the hierarchical object graph.
