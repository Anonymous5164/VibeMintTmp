import {
    AgentKit,
    CdpWalletProvider,
    wethActionProvider,
    walletActionProvider,
    erc20ActionProvider,
    cdpApiActionProvider,
    cdpWalletActionProvider,
    pythActionProvider,
  } from "@coinbase/agentkit";
  import { getLangChainTools } from "@coinbase/agentkit-langchain";
  import { HumanMessage } from "@langchain/core/messages";
  import { MemorySaver } from "@langchain/langgraph";
  import { createReactAgent } from "@langchain/langgraph/prebuilt";
  import { ChatOpenAI } from "@langchain/openai";
  import * as dotenv from "dotenv";
  import * as fs from "fs";
  import * as readline from "readline";
  import { z } from "zod"; // Import Zod for environment variable validation
  
  dotenv.config();
  
  /**
   * Validates that required environment variables are set
   *
   * @throws {Error} - If required environment variables are missing
   * @returns {void}
   */
  function validateEnvironment(): void {
    const envSchema = z.object({
      OPENAI_API_KEY: z.string().trim().min(1, "OPENAI_API_KEY is required"),
      CDP_API_KEY_NAME: z.string().trim().min(1, "CDP_API_KEY_NAME is required"),
      CDP_API_KEY_PRIVATE_KEY: z.string().trim().min(1, "CDP_API_KEY_PRIVATE_KEY is required"),
      NETWORK_ID: z.string().trim().optional(), // Optional, but good to check
      PINATA_API_KEY: z.string().trim().min(1, "Pinata API key is required"),
      PINATA_SECRET_API_KEY: z.string().trim().min(1, "Pinata secret API key is required"),
      CONTRACT_ADDRESS: z.string().trim().min(1, "Contract address is required"),
      IMAGE_URL: z.string().trim().url("Invalid image URL"),
      RECIPIENT_ADDRESS: z.string().trim().min(1, "Recipient address is required"),
    });
  
    try {
      envSchema.parse(process.env);
    } catch (error) {
      console.error("Environment variable validation error:", error);
      process.exit(1);
    }
  }
  
  // Add this right after imports and before any other code
  validateEnvironment();
  
  // Configure a file to persist the agent's CDP MPC Wallet Data
  const WALLET_DATA_FILE = "wallet_data.txt";
  
  /**
   * Initialize the agent with CDP Agentkit
   *
   * @returns Agent executor and config
   */
  async function initializeAgent() {
    try {
      // Initialize LLM
      const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
      });
  
      let walletDataStr: string | null = null;
  
      // Read existing wallet data if available
      if (fs.existsSync(WALLET_DATA_FILE)) {
        try {
          walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
        } catch (error) {
          console.error("Error reading wallet data:", error);
          // Continue without wallet data
        }
      }
  
      // Configure CDP Wallet Provider
      const config = {
        apiKeyName: process.env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        cdpWalletData: walletDataStr || undefined,
        networkId: process.env.NETWORK_ID || "base-sepolia",
      };
  
      const walletProvider = await CdpWalletProvider.configureWithWallet(config);
  
      // Initialize AgentKit
      const agentkit = await AgentKit.from({
        walletProvider,
        actionProviders: [
          wethActionProvider(),
          pythActionProvider(),
          walletActionProvider(),
          erc20ActionProvider(),
          cdpApiActionProvider({
            apiKeyName: process.env.CDP_API_KEY_NAME,
            apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
          cdpWalletActionProvider({
            apiKeyName: process.env.CDP_API_KEY_NAME,
            apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        ],
      });
  
      const tools = await getLangChainTools(agentkit);
  
      // Store buffered conversation history in memory
      const memory = new MemorySaver();
      const agentConfig = { configurable: { thread_id: "CDP AgentKit Chatbot Example!" } };
  
      // Create React Agent using the LLM and CDP AgentKit tools
      const agent = createReactAgent({
        llm,
        tools,
        checkpointSaver: memory,
        messageModifier: `
          You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are
          empowered to interact onchain using your tools. If you ever need funds, you can request them from the
          faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet details and request
          funds from the user. Before executing your first action, get the wallet details to see what network
          you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone
          asks you to do something you can't do with your currently available tools, you must say so, and
          encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to
          docs.cdp.coinbase.com for more information. Be concise and helpful with your responses. Refrain from
          restating your tools' descriptions unless it is explicitly requested. Also, you can mint NFTs. You can upload metadata to IPFS. You can transfer tokens.
          `,
      });
  
      // Save wallet data
      const exportedWallet = await walletProvider.exportWallet();
      fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));
  
      return { agent, config: agentConfig };
    } catch (error) {
      console.error("Failed to initialize agent:", error);
      throw error; // Re-throw to be handled by caller
    }
  }
  
  /**
   * Upload metadata to IPFS (using Pinata)
   *
   * @param imageUrl - URL of the image
   * @param name - Name of the NFT
   * @param description - Description of the NFT
   * @returns IPFS URI of the metadata
   */
  async function uploadMetadataToIPFS(imageUrl: string, name: string, description: string): Promise<string> {
    const metadata = {
      name: name,
      description: description,
      image: imageUrl,
    };
  
    const pinataSDK = require("@pinata/sdk");
    const pinata = new pinataSDK({
      pinataApiKey: process.env.PINATA_API_KEY,
      pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
    });
  
    try {
      const options = {
        pinataOptions: {
          cidVersion: 0,
        },
      };
      const result = await pinata.pinJSONToIPFS(metadata, options);
      console.log("Metadata uploaded to IPFS:", result);
      return `ipfs://${result.IpfsHash}`; // Return IPFS URI
    } catch (error) {
      console.error("Failed to upload metadata to IPFS:", error);
      throw error; // Re-throw to stop the process
    }
  }
  
  /**
   * Mint an NFT using the agent
   *
   * @param agent - The agent executor
   * @param recipientAddress - Address to receive the NFT
   * @param metadataURI - URI of the NFT metadata
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function mintNFT(agent: any, recipientAddress: string, metadataURI: string, config: any) {
    try {
      const mintPrompt = `Mint an NFT for recipient address ${recipientAddress} with metadata URI ${metadataURI}.`;
      const stream = await agent.stream({ messages: [new HumanMessage(mintPrompt)] }, config);
  
      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
      console.log("NFT minting process initiated.");
    } catch (error) {
      console.error("Failed to initiate NFT minting:", error);
    }
  }
  
  /**
   * Run the agent interactively based on user input
   *
   * @param agent - The agent executor
   * @param config - Agent configuration
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function runChatMode(agent: any, config: any) {
    console.log("Starting chat mode... Type 'exit' to end.");
  
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    const question = (prompt: string): Promise<string> =>
      new Promise(resolve => rl.question(prompt, resolve));
  
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const userInput = await question("\nPrompt: ");
  
        if (userInput.toLowerCase() === "exit") {
          break;
        }
  
        // Check if the user is asking to mint an NFT
        if (userInput.toLowerCase().startsWith("mint an nft")) {
          const NFT_NAME = "My Awesome NFT";
          const NFT_DESCRIPTION = "This is a cool NFT with a nice picture.";
          const IMAGE_URL = process.env.IMAGE_URL || "";
          const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || "";
  
          // 1. Upload metadata to IPFS
          const metadataURI = await uploadMetadataToIPFS(
            IMAGE_URL,
            NFT_NAME,
            NFT_DESCRIPTION
          );
  
          // 2. Mint the NFT
          await mintNFT(agent, RECIPIENT_ADDRESS, metadataURI, config);
        } else {
          const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);
  
          for await (const chunk of stream) {
            if ("agent" in chunk) {
              console.log(chunk.agent.messages[0].content);
            } else if ("tools" in chunk) {
              console.log(chunk.tools.messages[0].content);
            }
            console.log("-------------------");
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    } finally {
      rl.close();
    }
  }
  
  /**
   * Start the chatbot agent
   */
  async function main() {
    try {
      const { agent, config } = await initializeAgent();
      await runChatMode(agent, config);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
  
  if (require.main === module) {
    console.log("Starting Agent...");
    main().catch(error => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
  }
  