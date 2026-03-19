module.exports = {
  config: {
    name: "supportgc",
    version: "5.0",
    author: "Sbu",
    countDown: 10 ,
    role: 0,
    shortDescription: {
      en: "Add user to support group",
    },
    longDescription: {
      en: "T",
    },
    category: "support",
    guide: {
      en: "{p}{n}",
    },
  },

  onStart: async function ({ api, args, message, event }) {
    const supportGroupId = "7667715146607379";
    const threadID = event.threadID;
    const userID = event.senderID;

    const threadInfo = await api.getThreadInfo(supportGroupId);
    const participantIDs = threadInfo.participantIDs;

    if (participantIDs.includes(userID)) {
      api.sendMessage(
        "You are already in the support group. If you can't find it, please check your message requests or spam box.",
        threadID
      );
    } else {
      api.addUserToGroup(userID, supportGroupId, (err) => {
        if (err) {
          console.error("Failed to add user to support group:", err);
          api.sendMessage(
            "Sorry, I can't add you to the support group. It may be because your account is set to private or you have disabled message requests. Please check your settings and try again.",
            threadID
          );
        } else {
          api.sendMessage(
            "You have been added to the admin support group. If you can't find it in your inbox, please check your message requests or spam box.",
            threadID
          );
        }
      });
    }
  },
};