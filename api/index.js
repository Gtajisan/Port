"use strict";

/**
 * Baka-Chan Bot — Instagram API Library
 *
 * Drop-in FCA-compatible Instagram adapter.
 * Exposes the same interface as fca-unofficial / nexus-fca
 * so every command and event works without modification.
 *
 * Usage:
 *   const { createInstagramAPI } = require("./api");
 *   const api = await createInstagramAPI();
 */

const { createInstagramAPI } = require("../instagram/adapter");
const constants = require("./constants");
const events = require("./events");

module.exports = {
  createInstagramAPI,
  constants,
  events,
};
