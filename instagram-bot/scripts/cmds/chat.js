const axios = require("axios");

module.exports = {
  config: {
    name: "chat",
    author: "Farhan",
    version: "3.2.0",
    role: 0,
    category: "AI",
    shortDescription: "Chat with DeepSeek, FOSS-AI, Qwen, or GPT-5",
    longDescription: "Multi-AI chatbot using DeepSeek, FOSS-AI, Qwen, and GPT-5 from Oculux API. Supports aliases for quick use.",
    aliases: ["deepseek", "fossai", "qwen", "gpt5", "ds", "fs", "qw", "g5"],
    guide: {
      en: `
{pn} [model] [prompt]

🧩 Models (short names):
• ds / deepseek  → DeepSeek
• fs / fossai    → FOSS-AI
• qw / qwen      → Qwen
• g5 / gpt5      → GPT-5

💬 Examples:
• chat ds Hello
• chat fs Write a poem
• chat qw Translate this
• chat g5 Tell a story

🧠 You can also call directly:
• deepseek hello
• fossai explain code
• qwen translate
• gpt5 write code`
    }
  },

  onStart: async function ({ message, args, commandName }) {
    const cmd = commandName.toLowerCase();
    let modelKey;
    let prompt;

    // Detect direct alias call
    if (["ds", "deepseek"].includes(cmd)) {
      modelKey = "ds";
      prompt = args.join(" ");
    } else if (["fs", "fossai"].includes(cmd)) {
      modelKey = "fs";
      prompt = args.join(" ");
    } else if (["qw", "qwen"].includes(cmd)) {
      modelKey = "qw";
      prompt = args.join(" ");
    } else if (["g5", "gpt5"].includes(cmd)) {
      modelKey = "g5";
      prompt = args.join(" ");
    } else {
      // chat [model] [prompt] usage
      if (args.length < 2) {
        return message.reply(
          "⚙️ Usage: chat [model] [prompt]\n\nModels:\n- ds (DeepSeek)\n- fs (FOSS-AI)\n- qw (Qwen)\n- g5 (GPT-5)"
        );
      }
      modelKey = args[0].toLowerCase();
      prompt = args.slice(1).join(" ");
    }

    if (!prompt) {
      return message.reply("❗ Please provide a prompt or question.");
    }

    // Define all API endpoints
    const apis = {
      ds: {
        name: "DeepSeek",
        url: "https://dev.oculux.xyz/api/deepseek",
        model: "deepseek-chat"
      },
      fs: {
        name: "FOSS-AI",
        url: "https://dev.oculux.xyz/api/foss-ai",
        model: "DeepSeek-V3.1"
      },
      qw: {
        name: "Qwen",
        url: "https://dev.oculux.xyz/api/qwen",
        model: "qwen-flash"
      },
      g5: {
        name: "GPT-5",
        url: "https://dev.oculux.xyz/api/openai",
        model: "gpt-5"
      }
    };

    const api = apis[modelKey];
    if (!api) {
      return message.reply("❌ Invalid model! Use: ds | fs | qw | g5");
    }

    const chatId = message.threadID || Date.now().toString();

    try {
      await message.reply(`🤖 Using ${api.name}... Thinking...`);

      const res = await axios.get(api.url, {
        params: {
          prompt,
          chatId,
          model: api.model,
          system: "You are a helpful and intelligent assistant."
        },
        timeout: 40000
      });

      const output =
        res.data.response ||
        res.data.answer ||
        res.data.output ||
        res.data.message ||
        JSON.stringify(res.data, null, 2);

      message.reply(`🧠 ${api.name}:\n\n${output}`);
    } catch (err) {
      console.error(err);
      message.reply("⚠️ Failed to connect to API or invalid response.");
    }
  }
};
      
