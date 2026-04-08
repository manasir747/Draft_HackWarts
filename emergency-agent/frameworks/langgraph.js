import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage } from "@langchain/core/messages";
import { allTools } from "../tools/index.js";
import { MemorySaver } from "@langchain/langgraph";

export const initLangGraphAgent = () => {
  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    apiKey: process.env.GROQ_API_KEY,
  });

  const systemMessage = new SystemMessage(`
You are a highly efficient Emergency Health Response Assistant designed for India.
Your goal is to save lives by quickly analyzing the situation, dispatching the right services, and guiding the user.

Workflow requirements:
1. Understand the emergency described by the user. If complex, you can use 'classify_emergency' to get standard categorization.
2. Use 'get_user_location' to get the current coordinates/city.
3. Depending on severity and type, you must use 'contact_emergency_services' (e.g., 108 Ambulance, 100 Police, 101 Fire for India).
4. Provide immediate care instructions using 'suggest_first_aid'.
5. Send notifications using 'notify_contacts'.

Return your final answer in plain, simple English with the following structured format (DO NOT OUTPUT JSON):
----------------------------------
Emergency: [Brief summary of the user input in simple English]
Severity: [Target severity]
Reasoning: [Explanation of your thoughts in simple, easy-to-understand English]
Action Taken:
- [Action 1 in plain English]
- [Action 2 in plain English]
----------------------------------
`);

  // Add conversational memory
  const memory = new MemorySaver();

  // Create the agent using LangGraph's prebuilt React loop
  const app = createReactAgent({
    llm: model,
    tools: allTools,
    stateModifier: systemMessage
    // Disabled MemorySaver to prevent Google Gemini API alternating roles context corruption
  });

  return app;
};
