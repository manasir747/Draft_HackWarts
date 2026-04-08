import inquirer from 'inquirer';
import chalk from 'chalk';
import readlineSync from 'readline-sync';
import { initLangGraphAgent } from '../frameworks/langgraph.js';
import { initLangChainAgent } from '../frameworks/langchain.js';
import { HumanMessage } from '@langchain/core/messages';

export const startCLI = async () => {
  console.log(chalk.bold.red('=== Indian Emergency Health Response Assistant ===\n'));

  // Framework selection
  const { framework } = await inquirer.prompt([
    {
      type: 'list',
      name: 'framework',
      message: 'Choose your agent architecture framework:',
      choices: ['1. LangGraph (Recommended - StateGraph approach)', '2. LangChain (Legacy ToolCallingAgent approach)'],
    }
  ]);

  let agent;
  let useLangGraph = framework.startsWith('1');

  try {
    if (useLangGraph) {
      console.log(chalk.green('Initializing LangGraph Agent...'));
      agent = initLangGraphAgent();
    } else {
      console.log(chalk.yellow('Initializing LangChain Agent...'));
      agent = await initLangChainAgent();
    }
  } catch (error) {
    console.error(chalk.red('Failed to initialize agent. Did you set GROQ_API_KEY inside .env?'));
    console.error(error);
    process.exit(1);
  }

  console.log(chalk.bold.cyan('\nSystem Ready! Type your emergency below or type "exit" to quit.'));

  // Memory states for LangGraph
  const threadId = Math.random().toString(36).substring(7);
  const config = { configurable: { thread_id: threadId } };
  
  // Chat history for LangChain
  let chatHistory = [];

  while (true) {
    console.log();
    const input = readlineSync.question(chalk.bold.white('Describe your emergency: '));

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.green('Stay safe! Goodbye.'));
      break;
    }

    if (!input.trim()) continue;

    console.log(chalk.gray('\nAgent is reasoning... (this may take a few seconds as it calls multiple tools)'));
    try {
      if (useLangGraph) {
        // langgraph execution using invoke to avoid streaming blocks
        const response = await agent.invoke({
            messages: [new HumanMessage(input)]
        }, { ...config, recursionLimit: 25 });

        const lastMessage = response.messages[response.messages.length - 1];
        console.log('\n' + chalk.blueBright(lastMessage.content));
        
      } else {
        // langchain legacy executor
        const response = await agent.invoke({
          input,
          chat_history: chatHistory
        });
        
        chatHistory.push(new HumanMessage(input));
        chatHistory.push({ role: "assistant", content: response.output });

        console.log('\n' + chalk.blueBright(response.output));
      }
    } catch (error) {
      console.error(chalk.red('\nAn error occurred during agent execution. Retrying might help.'));
      console.error(error.message);
    }
  }
};
