import { ActionPriority } from "./types";

export const SEVERITY_OPTIONS = [
  { value: 10, label: "10 - Hazardous without warning" },
  { value: 9, label: "9 - Hazardous with warning" },
  { value: 8, label: "8 - Very High (Loss of primary function)" },
  { value: 7, label: "7 - High (Degradation of primary function)" },
  { value: 6, label: "6 - Moderate (Loss of secondary function)" },
  { value: 5, label: "5 - Low (Degradation of secondary function)" },
  { value: 4, label: "4 - Very Low (Appearance/Audible noise)" },
  { value: 3, label: "3 - Minor (Minor defect)" },
  { value: 2, label: "2 - Very Minor (Unnoticed by average customer)" },
  { value: 1, label: "1 - No Effect" },
];

export const OCCURRENCE_OPTIONS = [
  { value: 10, label: "10 - Extremely High (Almost inevitable)" },
  { value: 9, label: "9 - Very High" },
  { value: 8, label: "8 - High" },
  { value: 7, label: "7 - Moderately High" },
  { value: 6, label: "6 - Moderate" },
  { value: 5, label: "5 - Low" },
  { value: 4, label: "4 - Very Low" },
  { value: 3, label: "3 - Remote" },
  { value: 2, label: "2 - Very Remote" },
  { value: 1, label: "1 - Extremely Low (Failure unlikely)" },
];

export const DETECTION_OPTIONS = [
  { value: 10, label: "10 - Absolute Uncertainty (No control)" },
  { value: 9, label: "9 - Very Remote" },
  { value: 8, label: "8 - Remote" },
  { value: 7, label: "7 - Very Low" },
  { value: 6, label: "6 - Low" },
  { value: 5, label: "5 - Moderate" },
  { value: 4, label: "4 - Moderately High" },
  { value: 3, label: "3 - High" },
  { value: 2, label: "2 - Very High" },
  { value: 1, label: "1 - Almost Certain" },
];

// Simplified AIAG-VDA Action Priority Logic
export const calculateAP = (S: number, O: number, D: number): ActionPriority => {
  if (S >= 9) {
    if (O >= 6) return ActionPriority.HIGH;
    if (O >= 4 && D >= 7) return ActionPriority.HIGH; // Simplified logic
    if (O <= 3 && D >= 5) return ActionPriority.MEDIUM; // Approximation
    return ActionPriority.MEDIUM; // Conservative default for high severity
  }
  if (S >= 7) {
    if (O >= 8) return ActionPriority.HIGH;
    if (O >= 6 && D >= 5) return ActionPriority.HIGH;
    if (O >= 4 && D >= 7) return ActionPriority.HIGH;
    return ActionPriority.MEDIUM;
  }
  if (S >= 4) {
    if (O >= 8 && D >= 7) return ActionPriority.HIGH;
    if (O >= 6 && D >= 9) return ActionPriority.HIGH; // Simplified
    return ActionPriority.MEDIUM; // Often L or M
  }
  return ActionPriority.LOW;
};
