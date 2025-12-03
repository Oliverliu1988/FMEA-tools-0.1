import { GoogleGenAI, Type } from "@google/genai";
import { FmeaType } from "../types";

const createClient = () => {
    const key = process.env.API_KEY;
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
};

export const suggestStructure = async (scope: string, type: FmeaType) => {
    const ai = createClient();
    if (!ai) throw new Error("API Key not found");

    const prompt = `Act as an expert Quality Engineer. 
    I am performing a ${type}. The scope is: "${scope}".
    Generate a hierarchical structure for this analysis. 
    Return a list of component names or process steps that would be children of the main subject.
    Focus on physical components for DFMEA or process steps for PFMEA.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    items: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text || "{ \"items\": [] }").items;
};

export const suggestFunctions = async (itemName: string, type: FmeaType) => {
    const ai = createClient();
    if (!ai) throw new Error("API Key not found");

    const prompt = `I am doing a ${type}. 
    Suggest 3-5 functions and requirements for the item: "${itemName}".
    Return a JSON array of objects with 'description' (function) and 'requirements' (specifications).`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        requirements: { type: Type.STRING }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text || "[]");
};

export const suggestFailures = async (functionDesc: string, type: FmeaType) => {
    const ai = createClient();
    if (!ai) throw new Error("API Key not found");

    const prompt = `I am doing a ${type}.
    For the function: "${functionDesc}", suggest 3 potential failure modes.
    Return JSON array of strings.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    modes: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });

    return JSON.parse(response.text || "{ \"modes\": [] }").modes;
};

export const suggestRiskAnalysis = async (failureMode: string, type: FmeaType) => {
     const ai = createClient();
    if (!ai) throw new Error("API Key not found");
    
    const prompt = `I am doing a ${type}.
    For Failure Mode: "${failureMode}", suggest:
    1. One potential Effect.
    2. One potential Cause.
    3. A typical Prevention Control.
    4. A typical Detection Control.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    effect: { type: Type.STRING },
                    cause: { type: Type.STRING },
                    prevention: { type: Type.STRING },
                    detection: { type: Type.STRING }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
}
