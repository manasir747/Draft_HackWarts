import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { allTools } from "../tools/index.js";

// LangChain fallback implementation using Runnables and manual tool execution loop
export const initLangChainAgent = async () => {
  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    apiKey: process.env.GROQ_API_KEY,
  });

  const modelWithTools = model.bindTools(allTools);

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
You are a highly efficient Emergency Health Response Assistant designed for India.
Your goal is to save lives by quickly analyzing the situation, dispatching the right services, and guiding the user.

Workflow requirements:
1. Understand the emergency described by the user. Use 'classify_emergency' to get standard categorization.
2. Use 'get_user_location' to get the exact location.
3. Depending on severity and type, you must use 'contact_emergency_services' (e.g., 108 Ambulance, 100 Police, 101 Fire for India).
4. Provide immediate care using 'suggest_first_aid'.
5. Use 'notify_contacts' to alert family.

Return your final answer in the following structured format (DO NOT DEVIATE):
----------------------------------
Emergency: [Brief summary of the user input]
Severity: [Target severity]
Reasoning: [Explanation of your thoughts]
Action Taken:
- [Action 1]
- [Action 2]
----------------------------------
`),
    new MessagesPlaceholder("chat_history"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);

  const chain = prompt.pipe(modelWithTools);

  return {
    stream: undefined, // Not streaming in legacy fallback
    invoke: async ({ input, chat_history }) => {
      let result = await chain.invoke({ input, chat_history });
      
      let finalOutput = result.content;
      
      // Basic manual tool execution loop simulating AgentExecutor
      if (result.tool_calls && result.tool_calls.length > 0) {
        let toolResponses = "";
        for (const tc of result.tool_calls) {
           const tool = allTools.find(t => t.name === tc.name);
           if (tool) {
               const output = await tool.invoke(tc.args);
               toolResponses += `\n* Tool [${tc.name}] executed: ${output}`;
           }
        }
        
        // Final reasoning phase
        const finalModel = new ChatGroq({ model: "llama-3.1-8b-instant", temperature: 0.1, apiKey: process.env.GROQ_API_KEY });
        const finalPrompt = `You must ignore any urge to return JSON. Respond ONLY in simple conversational English. DO NOT output JSON.
        
        Original Request: ${input}
        Tool Execution Results: ${toolResponses}
        
        Format your response Exactly like this:
        ----------------------------------
        Emergency: [Simple English summary based on the request]
        Severity: [Low/Medium/High]
        Reasoning: [Friendly, simple English explanation of what happened]
        Action Taken:
        - [Actions to take in plain English]
        ----------------------------------`;
        
        const finalResult = await finalModel.invoke(finalPrompt);
        finalOutput = finalResult.content;
      }
      
      return { output: finalOutput };
    }
  };
};
