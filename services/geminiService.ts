import { GoogleGenAI, Type, Chat } from "@google/genai";
import { CoachInsights, Goal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates high-level performance analysis using the full protocol context.
 */
export const getSmartCoachInsights = async (
  goals: Goal[],
  completedGoals: Record<string, boolean>,
  currentHour: number,
  reflection: string = ""
): Promise<CoachInsights | null> => {
  try {
    const mvdGoals = goals.filter(g => g.isMVD);
    const mvdCompleted = mvdGoals.filter(g => completedGoals[g.id]).length;
    
    const protocolStatus = goals.map(g => 
      `- [${completedGoals[g.id] ? 'DONE' : 'PENDING'}] ${g.label} (${g.timeLabel}): ${g.target} ${g.isMVD ? '[CRITICAL]' : ''}`
    ).join('\n');

    const prompt = `
      User Performance Context (Moren OS):
      Current Time: ${currentHour}:00
      
      Protocol Status:
      ${protocolStatus}
      
      MVD (Minimum Viable Day) Progress: ${mvdCompleted}/${mvdGoals.length}
      User Reflection: "${reflection}"

      Task: You are the Moren Performance Coach, an elite executive coach specialized in high-performance protocols. 
      Analyze the protocol above. Identify patterns (e.g., missing deep work sessions, neglecting health, or winning the morning).
      
      Provide a specific, non-generic strategy. If they missed critical MVDs, suggest a "Hard Reset". If they are ahead, suggest a "Scale Up".
      
      Return the analysis in a structured JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Short, punchy title for the current state." },
            analysis: { type: Type.STRING, description: "2-3 sentences of deep insight based on specific tasks." },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 concrete, actionable steps to take in the next 2 hours."
            }
          },
          required: ["title", "analysis", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text) as CoachInsights;
  } catch (error) {
    console.error("Moren AI Coach Error:", error);
    return null;
  }
};

/**
 * Starts a conversational chat session with the performance coach.
 */
export const startCoachChat = (history: { role: 'user' | 'model', parts: { text: string }[] }[] = []): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are the Moren Performance Coach. You are direct, encouraging, and focused on high-performance execution. You help the user optimize their daily protocol, overcome blockers, and maintain discipline. Keep responses concise and actionable.",
    }
  });
};
