"use strict";

const logger = require("./logger.js");

function toStr(val) {
  return val != null ? String(val) : "";
}

function mapAttachments(items = []) {
  return items.map(item => {
    const base = {
      attachmentID: toStr(item.id || ""),
      type: "unknown",
      url: "",
      name: "",
      description: "",
    };

    const ct = (item.content_type || item.__typename || "").toLowerCase();

    if (ct.includes("image") || item.image_versions2) {
      const candidates = item.image_versions2?.candidates || [];
      const best = candidates[0] || {};
      return {
        ...base,
        type: "photo",
        url: best.url || item.url || "",
        width: best.width || 0,
        height: best.height || 0,
        previewUrl: (candidates[candidates.length - 1] || {}).url || "",
      };
    }

    if (ct.includes("video") || item.video_versions) {
      const vids = item.video_versions || [];
      return {
        ...base,
        type: "video",
        url: (vids[0] || {}).url || item.url || "",
        videoLength: item.video_duration || 0,
        previewUrl: (item.image_versions2?.candidates?.[0] || {}).url || "",
      };
    }

    if (ct.includes("audio") || item.audio) {
      return {
        ...base,
        type: "audio",
        url: item.audio?.audio_src || item.url || "",
        audioLength: item.audio?.duration || 0,
      };
    }

    if (ct.includes("sticker") || item.sticker_id) {
      return {
        ...base,
        type: "sticker",
        url: item.sticker?.image_versions2?.candidates?.[0]?.url || "",
        stickerID: toStr(item.sticker_id || ""),
        packID: toStr(item.sticker?.sticker_pack_id || ""),
      };
    }

    if (item.share && item.share.type === "story_reply") {
      return {
        ...base,
        type: "story_reply",
        url: item.share.url || "",
        description: item.share.title || "",
      };
    }

    return {
      ...base,
      type: ct || "unknown",
      url: item.url || "",
    };
  });
}

function mapReaction(reactionData, messageID, threadID, senderID) {
  return {
    type: "message_reaction",
    messageID: toStr(messageID),
    threadID: toStr(threadID),
    senderID: toStr(senderID),
    reaction: reactionData.reaction || "",
    userID: toStr(senderID),
    offlineThreadingID: toStr(messageID),
    timestamp: Date.now(),
    isGroup: false,
  };
}

function mapDirectMessage(rawItem, threadID, selfID) {
  const itemType = rawItem.item_type || "text";
  const senderID = toStr(rawItem.user_id);
  const msgID = toStr(rawItem.item_id);
  const ts = rawItem.timestamp ? Math.floor(rawItem.timestamp / 1000) : Date.now();

  let body = "";
  let attachments = [];
  let type = "message";

  if (rawItem.text) body = rawItem.text;

  if (rawItem.link) {
    body = rawItem.link.text || rawItem.link.link_context?.link_url || "";
  }

  if (rawItem.media) attachments = mapAttachments([rawItem.media]);
  if (rawItem.visual_media) attachments = mapAttachments([rawItem.visual_media.media]);
  if (rawItem.voice_media) attachments = mapAttachments([rawItem.voice_media]);
  if (rawItem.story_share) {
    attachments = mapAttachments([{ share: { type: "story_reply", url: rawItem.story_share.url, title: rawItem.story_share.title } }]);
  }
  if (rawItem.animated_media) attachments = mapAttachments([rawItem.animated_media]);

  if (rawItem.reel_share) {
    body = rawItem.reel_share.text || "";
    attachments = rawItem.reel_share.media ? mapAttachments([rawItem.reel_share.media]) : [];
  }

  if (rawItem.like) {
    body = rawItem.like;
    type = "message";
  }

  const isGroup = rawItem.thread_type === "group";
  const participantIDs = (rawItem.participants || []).map(p => toStr(p.pk || p.id));

  const mentions = {};
  if (rawItem.mentions) {
    for (const m of rawItem.mentions) {
      mentions[toStr(m.user_id)] = `@${m.username || m.user_id}`;
    }
  }

  const event = {
    type,
    body,
    senderID,
    threadID: toStr(threadID),
    messageID: msgID,
    attachments,
    timestamp: ts,
    isGroup,
    mentions,
    participantIDs,
    isUnread: rawItem.is_sent_by_viewer === false,
    sourceBot: "instagram",
  };

  if (rawItem.replied_to_message) {
    event.type = "message_reply";
    event.messageReply = {
      body: rawItem.replied_to_message.item?.text || "",
      senderID: toStr(rawItem.replied_to_message.item?.user_id || ""),
      messageID: toStr(rawItem.replied_to_message.item?.item_id || ""),
      attachments: [],
    };
  }

  logger.dm("MSG_MAPPER", `threadID=${threadID} senderID=${senderID} type=${type} body="${body.slice(0, 60)}"`);
  return event;
}

function mapThreadInfo(rawThread) {
  const participants = rawThread.users || [];
  const participantIDs = participants.map(u => toStr(u.pk || u.id || ""));
  const nickNames = {};
  const userInfo = {};

  for (const u of participants) {
    const uid = toStr(u.pk || u.id || "");
    userInfo[uid] = {
      name: u.full_name || u.username || "",
      firstName: (u.full_name || "").split(" ")[0] || u.username || "",
      vanity: u.username || "",
      profilePic: u.profile_pic_url || "",
      profilePicLarge: u.hd_profile_pic_url_info?.url || u.profile_pic_url || "",
      gender: 0,
      type: "user",
    };
  }

  if (rawThread.nicknames) {
    for (const [uid, nick] of Object.entries(rawThread.nicknames)) {
      nickNames[toStr(uid)] = nick;
    }
  }

  return {
    threadID: toStr(rawThread.thread_id || rawThread.id || ""),
    name: rawThread.thread_title || rawThread.thread_type === "group" ? rawThread.thread_title || "" : "",
    participantIDs,
    userInfo,
    nickNames,
    emoji: rawThread.thread_theme?.emoji || "",
    adminIDs: (rawThread.admin_user_ids || []).map(id => ({ id: toStr(id) })),
    approvalMode: 0,
    isGroup: rawThread.thread_type === "group",
    messageCount: rawThread.message_count || 0,
    imageSrc: rawThread.image?.url || "",
  };
}

function mapUserInfo(rawUser) {
  const uid = toStr(rawUser.pk || rawUser.id || "");
  return {
    [uid]: {
      name: rawUser.full_name || rawUser.username || "",
      firstName: (rawUser.full_name || "").split(" ")[0] || rawUser.username || "",
      vanity: rawUser.username || "",
      profilePic: rawUser.profile_pic_url || "",
      profilePicLarge: rawUser.hd_profile_pic_url_info?.url || rawUser.profile_pic_url || "",
      gender: 0,
      type: "user",
    },
  };
}

module.exports = { mapDirectMessage, mapThreadInfo, mapUserInfo, mapAttachments, mapReaction };
