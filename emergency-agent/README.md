# Indian Emergency Health Response Assistant

A terminal-based agentic AI application built with Node.js that simulates an Emergency Health Response Assistant tailored for India.

## Features

- **Real Agent Loop**: Uses LLM reasoning (Input → Reason → Decide → Act → Observe → Repeat) powered by Google Gemini API.
- **Dual Framework Support**: Choose between **LangGraph** (StateGraph / ReAct approach) or **LangChain** (Legacy AgentExecutor approach) at startup.
- **India-centric Context**: Includes tools for specific numbers (108 Ambulance, 100 Police, 101 Fire) and standard protocols for road accidents, fires, and cardiac arrests.
- **Tool Calling (Function Calling)**:
  - `classify_emergency`: LLM tool to analyze standard context and figure out severity logic.
  - `get_user_location`: Simulates GPS fetching (defaults to Indian locations).
  - `suggest_first_aid`: Pulls specific first aid instructions based on condition types.
  - `contact_emergency_services`: Simulates dispatching to correct Indian emergency hotlines.
  - `notify_contacts`: Sends alerts to relatives.
- **Persistent Memory**: Retains conversation history throughout the terminal session.

## Prerequisites

- **Node.js**: `v18.0.0` or higher recommended.
- **API Key**: You need a valid Google Gemini API Key.

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment variables**:
   Create a `.env` file in the root directory and add your Gemini API Key:
   ```bash
   cp .env.example .env
   # Edit .env and put your actual GEMINI_API_KEY inside
   ```

3. **Run the Application**:
   ```bash
   node index.js
   ```

## Example Usage

```
=== Indian Emergency Health Response Assistant ===

? Choose your agent architecture framework: (Use arrow keys)
❯ 1. LangGraph (Recommended - StateGraph approach)
  2. LangChain (Legacy ToolCallingAgent approach)

Initializing LangGraph Agent...

System Ready! Type your emergency below or type "exit" to quit.

Describe your emergency: There is a terrible road accident here. A person is bleeding.
```

The agent will automatically deduce the severity, extract insights, and dynamically pick tools to execute.

## Code Structure

- `/agent` / `/frameworks` - Contains `langgraph.js` and `langchain.js` logic.
- `/tools/index.js` - Defines all LLM-callable functions and JSON schemas.
- `/cli/index.js` - Contains the terminal interactive rendering logic using `readline-sync` and `inquirer`.
