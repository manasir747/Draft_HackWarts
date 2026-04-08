import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatGroq } from "@langchain/groq";

export const classifyEmergencyTool = tool(
  async ({ description }) => {
    const model = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY,
    });
    const prompt = `
    You are an expert emergency classifier for India.
    Classify the following emergency situation. 
    Respond in strict JSON with:
    - "type": (e.g., road_accident, cardiac_arrest, fire, assault, medical_emergency)
    - "severity": (Low, Medium, High)
    - "explanation": Brief reasoning
    
    Description: "${description}"
    `;
    const response = await model.invoke(prompt);
    const text = response.content;
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)```/) || text.match(/{[\s\S]*}/);
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text);
    } catch(e) {
      parsed = { type: "unknown", severity: "High", explanation: "Failed to parse. Assuming High severity by default." };
    }
    return JSON.stringify(parsed);
  },
  {
    name: "classify_emergency",
    description: "Use an LLM to classify an emergency description into type and severity. Use this when you need deeper understanding of the emergency context.",
    schema: z.object({
      description: z.string().describe("The raw emergency description from the user")
    })
  }
);

export const getUserLocationTool = tool(
  async ({ userId }) => {
    // Simulating fetching a GPS location for India
    return JSON.stringify({
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      coordinates: "12.9716, 77.5946"
    });
  },
  {
    name: "get_user_location",
    description: "Get the exact geographical location of the user based on their user ID or device.",
    schema: z.object({
      userId: z.string().optional().describe("User ID to fetch location for")
    })
  }
);

export const suggestFirstAidTool = tool(
  async ({ emergencyType }) => {
    const treatments = {
      cardiac_arrest: "First Aid: Immediately start CPR. Press hard and fast in the center of the chest. Do not stop until help arrives.",
      road_accident: "First Aid: Do not move the victim unless there is an immediate danger (like fire). Apply pressure to any bleeding wounds with a clean cloth.",
      fire: "First Aid: Stop, drop, and roll if clothing is on fire. Cool burns under cold running water for at least 15 minutes. Do not apply ice.",
      assault: "First Aid: Ensure the attacker has left. Keep the victim calm and still. Apply pressure to wounds. Do not disturb potential evidence.",
      default: "First Aid: Keep the person calm, comfortable, and warm. Observe their breathing and pulse."
    };
    return treatments[emergencyType.toLowerCase()] || treatments.default;
  },
  {
    name: "suggest_first_aid",
    description: "Suggest immediate first aid procedures for specific emergency types.",
    schema: z.object({
      emergencyType: z.string().describe("Type of emergency: road_accident, cardiac_arrest, fire, assault, etc.")
    })
  }
);

export const contactEmergencyServicesTool = tool(
  async ({ serviceType, location, severity }) => {
    let number = "112"; // National Emergency Number India
    if (serviceType.toLowerCase().includes("ambulance")) number = "108";
    else if (serviceType.toLowerCase().includes("police")) number = "100";
    else if (serviceType.toLowerCase().includes("fire")) number = "101";

    return `Simulated Dispatch Action executed: Contacted ${serviceType} at ${number} for location: ${location}. Severity: ${severity}. Status: Dispatched, ETA 10 minutes.`;
  },
  {
    name: "contact_emergency_services",
    description: "Contact appropriate Indian emergency services (Ambulance, Police, Fire) with location and severity details.",
    schema: z.object({
      serviceType: z.string().describe("Type of service needed: 'Ambulance', 'Police', 'Fire'"),
      location: z.string().describe("The location to dispatch services to"),
      severity: z.string().describe("The severity: Low, Medium, High")
    })
  }
);

export const notifyContactsTool = tool(
  async ({ message, relation }) => {
    return `Simulated Notification Action executed: SMS sent to ${relation} with message: "${message}".`;
  },
  {
    name: "notify_contacts",
    description: "Send automated emergency alerts to the user's emergency contacts.",
    schema: z.object({
      message: z.string().describe("The emergency alert message to send"),
      relation: z.string().describe("Who to notify, e.g., 'family', 'parents', 'spouse'")
    })
  }
);

export const allTools = [
  classifyEmergencyTool,
  getUserLocationTool,
  suggestFirstAidTool,
  contactEmergencyServicesTool,
  notifyContactsTool
];
