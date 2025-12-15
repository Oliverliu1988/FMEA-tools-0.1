# AIAG-VDA FMEA Master - Design Document

## 1. System Overview
This software is a comprehensive Failure Mode and Effects Analysis (FMEA) tool designed to comply with the **AIAG-VDA 7-Step Approach**. It supports DFMEA (Design), PFMEA (Process), and FMEA-MSR. It utilizes a Single Page Application (SPA) architecture with a hierarchical data model.

## 2. Architecture

### Tech Stack
*   **Frontend Library:** React 19
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **AI Integration:** Google Gemini API (via `@google/genai`)
*   **Icons:** Lucide React

### State Management
*   **Single Source of Truth:** The `App.tsx` component holds the master state:
    *   `project` (Object): Metadata about the project (Name, Manager, Scope, etc.).
    *   `structure` (Array): The recursive tree containing the entire analysis data.
*   **Data Flow:** State is passed down to child components (`Step1` through `Step7`) via props. Child components invoke callback functions (e.g., `updateStructure`) to modify the master state in `App.tsx`.

## 3. Data Model
The data is structured as a hierarchical JSON tree (Deeply Nested), ensuring that if a parent component is moved or deleted, all associated functions, failures, and risks are automatically managed.

**Hierarchy:**
1.  **StructureNode** (System / Subsystem / Component / Process Step)
    *   *Has Many:* **FmeaFunction**
        *   *Has Many:* **FmeaFailure** (Failure Mode)
            *   *Has Many:* **FmeaCause** (Failure Cause)
                *   *Has Many:* **FmeaAction** (Optimization Actions)

### Key Relationships
*   **Failure Net:** A Failure Mode is linked to *Effects* (Higher Level) and *Causes* (Lower Level).
*   **Risk Logic:** 
    *   **Severity (S)** is associated with the *Effect* (but stored at the Cause/Failure level for row-based calculation in this implementation).
    *   **Occurrence (O)** is associated with the *Cause*.
    *   **Detection (D)** is associated with the *Cause* (Controls).
    *   **Action Priority (AP)** is calculated based on S, O, D tables (AIAG-VDA logic).

## 4. Module Descriptions

### Step 1: Planning (Project Scope)
*   **Function:** Manage metadata and import/export base files.
*   **Logic:** Parses CSV/JSON to populate the initial State.

### Step 2: Structure Analysis (The Tree)
*   **Function:** recursive tree editor.
*   **Logic:** Uses recursive functions to traverse `structure` to Find, Add, or Delete nodes by ID.
*   **AI Feature:** Generates component lists based on Scope string.

### Step 3: Function Analysis
*   **Function:** Define what each node *does*.
*   **Logic:** Selects a node from the tree and edits its `functions` array.

### Step 4: Failure Analysis (The Chains)
*   **Function:** Connect Function -> Failure Mode -> Effects & Causes.
*   **Logic:** The "Failure Chain" is built here. AI can suggest modes, effects, and causes based on the function description.

### Step 5: Risk Analysis (Scoring)
*   **Function:** Assign S/O/D ratings.
*   **Logic:** Flattens the tree into "FMEA Rows" (centered on the Cause) to allow tabular editing. Updates the deep tree structure when a score changes.

### Step 6: Optimization (Actions)
*   **Function:** Continuous Improvement.
*   **Logic:** Adds mitigation actions to specific Causes. Re-calculates "New AP" based on projected S/O/D improvements.

### Step 7: Documentation
*   **Function:** Reporting.
*   **Logic:** Read-only traversal of the tree to generate Tables, CSVs, or JSON exports.

## 5. Security & Persistence
*   **Data Privacy:** All processing is client-side. Data is not sent to any server (except the specific prompt text sent to Gemini API).
*   **Persistence:** Currently session-based. Users must "Export JSON" to save progress.

## 6. Future Roadmap
*   **Backend Integration:** Save to database instead of JSON files.
*   **Real-time Collaboration:** WebSockets for multi-user editing.
*   **Graphical Nets:** Visualization of the Failure Net using node-link diagrams.
