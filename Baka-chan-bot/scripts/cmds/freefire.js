const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "ffprofile",
    aliases: ["ffp", "ffv", "freefirep", "ffpro"],
    version: "2.2",
    credits: "Farhan",
    countDown: 5,
    hasPermission: 0,
    description: "Fetch Free Fire profile image (v2 with backup API)",
    longDescription: "Fetch and send Free Fire profile PNG using UID via hridoy-ff API with automatic fallback to backup API.",
    commandCategory: "fun",
    guide: {
      en: "{pn} <uid>\nExample: {pn} 12079916406"
    }
  },

  run: async function ({ api, event, args }) {
    let uid = args[0]?.replace(/[^0-9]/g, "");

    // Auto-detect UID from reply if missing
    if (!uid && event.type === "message_reply") {
      const match = event.messageReply.body.match(/\d{5,}/);
      if (match) uid = match[0];
    }

    if (!uid) {
      return api.sendMessage(
        "⚠ Please provide a valid Free Fire UID.\nExample: ffprofile2 12079916406",
        event.threadID
      );
    }

    // Ensure cache directory exists
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(cacheDir, `ff2_${uid}_${Date.now()}.png`);

    // API endpoints
    const mainAPI = `https://hridoy-ff-1.onrender.com/api/profile?uid=${uid}`;
    const backupAPI = `https://nexalo-api.vercel.app/api/ff?id=${uid}`;

    const loadingMsg = await api.sendMessage("⏳ | Generating your Free Fire profile image...", event.threadID);

    try {
      let response;
      try {
        response = await axios.get(mainAPI, { responseType: "arraybuffer", timeout: 25000 });
      } catch {
        console.warn("Main API failed, switching to backup API...");
        response = await axios.get(backupAPI, { responseType: "arraybuffer", timeout: 25000 });
      }

      fs.writeFileSync(filePath, response.data);

      await api.editMessage(
        `✅ | Free Fire profile generated!\n🎮 UID: ${uid}\n based:frn \n💾 API: ${response.config.url.includes("hridoy-ff") ? "Main" : "Backup"}`,
        loadingMsg.messageID
      );

      await api.sendMessage(
        {
          body: `✨ | Here’s your Free Fire profile:`,
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        () => fs.unlinkSync(filePath)
      );

    } catch (error) {
      console.error("FFProfile2 Error:", error.message);

      let msg = "❌ | Failed to fetch profile. Please check the UID or try again later.";
      if (error.response?.status === 400) msg = "⚠ | Missing or invalid UID.\nContact: t.me/FarhanGPT5";
      else if (error.code === "ECONNABORTED") msg = "⌛ | Request timed out. Please try again.";

      api.editMessage(msg, loadingMsg.messageID);
    }
  }
};
