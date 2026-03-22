"use strict";

/**
 * Baka-Chan Admin Stats Collector
 *
 * Tracks bot activity in real-time:
 * - Thread count and details
 * - User interactions
 * - Message statistics
 * - Activity metrics
 *
 * Updated by the bot as messages are processed.
 */

class AdminStats {
  constructor() {
    this.threads = new Map();
    this.users = new Map();
    this.messages = 0;
    this.messagesToday = 0;
    this.hourlyMessages = Array(24).fill(0);
    this.startTime = Date.now();
    this.lastReset = Date.now();
    
    // Reset daily stats at midnight
    this.scheduleResets();
  }

  /**
   * Log an incoming message
   */
  trackMessage(event) {
    if (!event) return;

    // Increment total messages
    this.messages++;
    this.messagesToday++;

    // Track hourly messages
    const hour = new Date().getHours();
    this.hourlyMessages[hour]++;

    // Track thread
    const threadID = String(event.threadID);
    if (!this.threads.has(threadID)) {
      this.threads.set(threadID, {
        threadID,
        name: event.threadName || threadID,
        isGroup: event.isGroup || false,
        participants: 1,
        messageCount: 0,
        unread: 0,
        lastActivity: Date.now(),
        sourceType: event.sourceType || "user",
        source: event.source || "instagram",
      });
    }

    const thread = this.threads.get(threadID);
    thread.messageCount++;
    thread.lastActivity = Date.now();
    if (!event.isBot) {
      thread.unread++;
    }

    // Track user
    const userID = String(event.senderID);
    if (!this.users.has(userID)) {
      this.users.set(userID, {
        id: userID,
        name: event.senderName || userID,
        vanity: event.senderVanity || userID,
        profilePic: event.senderProfilePic || "",
        messageCount: 0,
        lastSeen: Date.now(),
        sourceType: event.sourceType || "user",
        source: event.source || "instagram",
      });
    }

    const user = this.users.get(userID);
    user.messageCount++;
    user.lastSeen = Date.now();
  }

  /**
   * Log an outgoing message sent by bot
   */
  trackBotMessage(threadID) {
    if (!threadID) return;

    this.messages++;
    this.messagesToday++;

    const hour = new Date().getHours();
    this.hourlyMessages[hour]++;

    const tid = String(threadID);
    if (this.threads.has(tid)) {
      const thread = this.threads.get(tid);
      thread.messageCount++;
      thread.unread = Math.max(0, thread.unread - 1);
    }
  }

  /**
   * Update thread info
   */
  updateThread(threadID, info) {
    const tid = String(threadID);
    if (this.threads.has(tid)) {
      const thread = this.threads.get(tid);
      Object.assign(thread, info, { threadID: tid });
    } else {
      this.threads.set(tid, { threadID: tid, ...info });
    }
  }

  /**
   * Mark thread as read
   */
  markThreadRead(threadID) {
    const tid = String(threadID);
    if (this.threads.has(tid)) {
      this.threads.get(tid).unread = 0;
    }
  }

  /**
   * Get dashboard stats
   */
  getDashboard() {
    const threads = Array.from(this.threads.values()).sort((a, b) => b.lastActivity - a.lastActivity);
    return {
      threads: this.threads.size,
      users: this.users.size,
      messages: this.messages,
      messagesToday: this.messagesToday,
      uptime: Date.now() - this.startTime,
      recentThreads: threads.slice(0, 5).map(t => ({
        threadID: t.threadID.slice(0, 12),
        name: t.name,
        isGroup: t.isGroup,
        unread: t.unread,
        lastActivity: this.formatTime(t.lastActivity),
      })),
    };
  }

  /**
   * Get all threads
   */
  getThreads() {
    return Array.from(this.threads.values())
      .sort((a, b) => b.messageCount - a.messageCount)
      .map(t => ({
        threadID: t.threadID.slice(0, 12),
        name: t.name || t.threadID.slice(0, 20),
        isGroup: t.isGroup,
        participants: t.participants || 2,
        messageCount: t.messageCount,
        unread: t.unread,
        sourceType: t.sourceType,
        source: t.source,
      }));
  }

  /**
   * Get users
   */
  getUsers() {
    return Array.from(this.users.values())
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 50)
      .map(u => ({
        id: u.id.slice(0, 12),
        name: u.name || u.vanity,
        vanity: u.vanity,
        profilePic: u.profilePic,
        messageCount: u.messageCount,
        lastSeen: this.formatTime(u.lastSeen),
        sourceType: u.sourceType,
        source: u.source,
      }));
  }

  /**
   * Get message stats
   */
  getMessages() {
    return {
      total: this.messages,
      today: this.messagesToday,
      hourly: this.hourlyMessages.map((count, hour) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        count,
      })),
    };
  }

  /**
   * Reset daily stats at midnight
   */
  scheduleResets() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.messagesToday = 0;
      this.hourlyMessages = Array(24).fill(0);
      this.lastReset = Date.now();

      // Reset for threads
      for (const thread of this.threads.values()) {
        thread.unread = 0;
      }

      // Schedule next reset
      this.scheduleResets();
    }, msUntilMidnight);
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  /**
   * Export stats as JSON
   */
  export() {
    return {
      threads: this.getThreads(),
      users: this.getUsers(),
      messages: this.getMessages(),
      dashboard: this.getDashboard(),
      timestamp: Date.now(),
    };
  }
}

// Initialize global stats
global.adminStats = new AdminStats();

module.exports = { AdminStats };
