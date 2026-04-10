import os
from dotenv import load_dotenv

load_dotenv()
import sys
import re
import importlib
import textwrap
from groq import Groq


def send_alert(message: str) -> str:
    return f"Alert sent: {message}"


def log_event(event: str) -> str:
    return f"Event logged: {event}"


def suggest_action(context: str) -> str:
    return f"Suggested action: consider '{context}'"


def run_tool(tool_name: str, action_input: str) -> str:
    if tool_name == "send_alert":
        return send_alert(action_input)
    if tool_name == "log_event":
        return log_event(action_input)
    if tool_name == "suggest_action":
        return suggest_action(action_input)
    return "No tool executed."


def import_first(qualified_names):
    for name in qualified_names:
        module_path, attr = name.rsplit(".", 1)
        try:
            module = importlib.import_module(module_path)
            return getattr(module, attr)
        except Exception:
            continue
    raise ImportError("Could not import: " + ", ".join(qualified_names))


def parse_action_block(text: str) -> dict:
    pattern = (
        r"Thought:\s*(?P<thought>.*)\n"
        r"Action:\s*(?P<action>.*)\n"
        r"Action Input:\s*(?P<input>.*)"
    )
    match = re.search(pattern, text.strip(), re.DOTALL)
    if not match:
        return {
            "thought": "Could not parse. Defaulting to no action.",
            "action": "none",
            "action_input": "",
        }
    action = match.group("action").strip().lower()
    action = action.replace(" ", "_")
    if action not in {"send_alert", "log_event", "suggest_action", "none"}:
        action = "none"
    return {
        "thought": match.group("thought").strip(),
        "action": action,
        "action_input": match.group("input").strip(),
    }


def call_groq(client, model_name: str, prompt: str) -> str:
    result = client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return (result.choices[0].message.content or "").strip()


def get_agent_step(client, model_name: str, user_input: str, scratchpad: str) -> dict:
    prompt = textwrap.dedent(
        f"""
        You are an autonomous terminal agent. Decide the next action.

        Tools you can use:
        - send_alert(message)
        - log_event(event)
        - suggest_action(context)

        Rules:
        - Output ONLY this format:
          Thought: ...
          Action: one of [send_alert, log_event, suggest_action, none]
          Action Input: ...

        User input: {user_input}

        Scratchpad so far:
        {scratchpad}
        """
    ).strip()
    return parse_action_block(call_groq(client, model_name, prompt))


def get_final_answer(client, model_name: str, user_input: str, scratchpad: str) -> str:
    prompt = textwrap.dedent(
        f"""
        You are a helpful terminal-based agent.
        Provide a concise, beginner-friendly final answer.

        User input: {user_input}

        Scratchpad (thoughts, actions, observations):
        {scratchpad}
        """
    ).strip()
    return call_groq(client, model_name, prompt)


def main():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Missing GROQ_API_KEY. Set it and try again.")
        return

    client = Groq(api_key=api_key)
    model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    print("Terminal Agent ready. Type 'exit' to quit.")
    while True:
        mode = input("\nChoose mode [current, langchain, langgraph]: ").strip().lower()
        if mode in {"exit", "quit"}:
            print("Goodbye.")
            break
        if mode not in {"current", "langchain", "langgraph"}:
            print("Unknown mode. Try: current, langchain, langgraph.")
            continue

        user_input = input("\nYou: ").strip()
        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        if mode == "current":
            scratchpad_lines = []
            max_steps = 4
            attempts_used = 0

            for step_index in range(max_steps):
                attempts_used = step_index + 1
                step = get_agent_step(client, model_name, user_input, "\n".join(scratchpad_lines))
                thought = step["thought"]
                action = step["action"]
                action_input = step["action_input"]

                if action == "none":
                    observation = "No tool used."
                else:
                    observation = run_tool(action, action_input)

                scratchpad_lines.append(f"Thought: {thought}")
                scratchpad_lines.append(f"Action: {action}")
                scratchpad_lines.append(f"Action Input: {action_input}")
                scratchpad_lines.append(f"Observation: {observation}")

                print(f"\nAttempt {attempts_used}")
                print(f"Thought: {thought}\n")
                print(f"Action: {action}\n")
                print(f"Observation: {observation}\n")

                if action == "none":
                    break

            final_answer = get_final_answer(
                client,
                model_name,
                user_input,
                "\n".join(scratchpad_lines),
            )
            print(f"Final Answer: {final_answer}")
            print(f"Attempts: {attempts_used}")
            continue

        if mode == "langchain":
            try:
                from langchain_groq import ChatGroq
                from langchain_core.tools import StructuredTool
                from langchain.agents import create_agent
                from pydantic import BaseModel, Field
            except Exception as exc:
                print(f"LangChain import error: {exc}")
                print(f"Python: {sys.executable}")
                print("Install: pip install langchain langchain-groq")
                continue

            class SendAlertArgs(BaseModel):
                message: str = Field(..., description="Alert message")

            class LogEventArgs(BaseModel):
                event: str = Field(..., description="Event to log")

            class SuggestActionArgs(BaseModel):
                context: str = Field(..., description="Context for a suggestion")

            tools = [
                StructuredTool.from_function(
                    name="send_alert",
                    func=send_alert,
                    args_schema=SendAlertArgs,
                    description="Simulate an emergency alert.",
                ),
                StructuredTool.from_function(
                    name="log_event",
                    func=log_event,
                    args_schema=LogEventArgs,
                    description="Simulate logging an event.",
                ),
                StructuredTool.from_function(
                    name="suggest_action",
                    func=suggest_action,
                    args_schema=SuggestActionArgs,
                    description="Return a helpful suggestion.",
                ),
            ]

            llm = ChatGroq(
                model=model_name,
                groq_api_key=api_key,
                temperature=0.2,
            )
            agent = create_agent(
                model=llm,
                tools=tools,
                system_prompt=(
                    "You are a helpful terminal-based assistant. Use tools when useful "
                    "and keep answers concise."
                ),
            )
            result = agent.invoke({"messages": [{"role": "user", "content": user_input}]})
            final_text = ""
            messages = result.get("messages", []) if isinstance(result, dict) else []
            if messages:
                last_message = messages[-1]
                content = getattr(last_message, "content", "")
                if isinstance(content, list):
                    final_text = "\n".join(
                        str(item.get("text", "")) if isinstance(item, dict) else str(item)
                        for item in content
                    ).strip()
                else:
                    final_text = str(content).strip()
            if not final_text and isinstance(result, dict):
                final_text = str(result.get("output", "")).strip()
            print(f"Final Answer: {final_text}")
            print("Attempts: 1")
            continue

        if mode == "langgraph":
            try:
                from typing import TypedDict, List
                from langgraph.graph import StateGraph, END
                from langchain_groq import ChatGroq
                from langchain_core.messages import HumanMessage, AIMessage
            except Exception as exc:
                print(f"LangGraph import error: {exc}")
                print(f"Python: {sys.executable}")
                print("Install: pip install langgraph langchain langchain-groq")
                continue

            tools = {
                "send_alert": send_alert,
                "log_event": log_event,
                "suggest_action": suggest_action,
            }

            class AgentState(TypedDict):
                messages: List
                attempts: int

            llm = ChatGroq(
                model=model_name,
                groq_api_key=api_key,
                temperature=0.2,
            )

            def agent_node(state: AgentState):
                attempts = state["attempts"] + 1
                scratchpad = "\n".join(
                    [m.content for m in state["messages"] if isinstance(m, AIMessage)]
                )
                step = get_agent_step(client, model_name, user_input, scratchpad)
                thought = step["thought"]
                action = step["action"]
                action_input = step["action_input"]
                if action == "none":
                    observation = "No tool used."
                else:
                    observation = run_tool(action, action_input)
                print(f"\nAttempt {attempts}")
                print(f"Thought: {thought}\n")
                print(f"Action: {action}\n")
                print(f"Observation: {observation}\n")
                msg = AIMessage(
                    content=(
                        f"Thought: {thought}\n"
                        f"Action: {action}\n"
                        f"Action Input: {action_input}\n"
                        f"Observation: {observation}"
                    )
                )
                return {"messages": state["messages"] + [msg], "attempts": attempts}

            def should_continue(state: AgentState):
                last = state["messages"][-1].content
                return END if "Action: none" in last else "agent"

            graph = StateGraph(AgentState)
            graph.add_node("agent", agent_node)
            graph.add_conditional_edges("agent", should_continue)
            graph.set_entry_point("agent")
            app = graph.compile()

            initial = {
                "messages": [HumanMessage(content=user_input)],
                "attempts": 0,
            }
            final_state = app.invoke(initial)
            scratchpad = "\n".join([m.content for m in final_state["messages"]])
            final_answer = get_final_answer(client, model_name, user_input, scratchpad)
            print(f"Final Answer: {final_answer}")
            print(f"Attempts: {final_state['attempts']}")


if __name__ == "__main__":
    main()
