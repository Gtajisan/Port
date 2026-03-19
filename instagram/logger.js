"use strict";

const path = require("path");
const fs = require("fs");
const chalk = require("chalk");
const winston = require("winston");
require("winston-daily-rotate-file");

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const timestampFormat = () =>
  new Date().toLocaleString("sv-SE", {
    timeZone: process.env.TZ || "Asia/Ho_Chi_Minh",
    hour12: false,
  }).replace("T", " ");

const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "sakura-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "14d",
  zippedArchive: false,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) =>
      `[${timestamp}] [${level.toUpperCase()}] ${message}`
    )
  ),
});

const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [fileTransport],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "exceptions.log") }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "rejections.log") }),
  ],
});

function formatMsg(level, label, message) {
  if (message === undefined) {
    message = label;
    label = null;
  }
  const ts = timestampFormat();
  return { ts, label, message };
}

const logger = {
  info(label, message) {
    const { ts, label: l, message: m } = formatMsg("INFO", label, message);
    const prefix = l ? chalk.cyan(`[INFO] [${l}]`) : chalk.cyan("[INFO]");
    console.log(`${chalk.gray(ts)} ${prefix} ${m}`);
    winstonLogger.info(l ? `[${l}] ${m}` : m);
  },

  warn(label, message) {
    const { ts, label: l, message: m } = formatMsg("WARN", label, message);
    const prefix = l ? chalk.yellow(`[WARN] [${l}]`) : chalk.yellow("[WARN]");
    console.log(`${chalk.gray(ts)} ${prefix} ${m}`);
    winstonLogger.warn(l ? `[${l}] ${m}` : m);
  },

  error(label, message) {
    const { ts, label: l, message: m } = formatMsg("ERROR", label, message);
    const prefix = l ? chalk.red(`[ERROR] [${l}]`) : chalk.red("[ERROR]");
    const msgStr = m instanceof Error ? m.stack || m.message : String(m);
    console.log(`${chalk.gray(ts)} ${prefix} ${msgStr}`);
    winstonLogger.error(l ? `[${l}] ${msgStr}` : msgStr);
  },

  debug(label, message) {
    const { ts, label: l, message: m } = formatMsg("DEBUG", label, message);
    const prefix = l ? chalk.gray(`[DEBUG] [${l}]`) : chalk.gray("[DEBUG]");
    console.log(`${chalk.gray(ts)} ${prefix} ${m}`);
    winstonLogger.debug(l ? `[${l}] ${m}` : m);
  },

  cmd(label, message) {
    const { ts, label: l, message: m } = formatMsg("CMD", label, message);
    const prefix = l ? chalk.green(`[CMD] [${l}]`) : chalk.green("[CMD]");
    console.log(`${chalk.gray(ts)} ${prefix} ${m}`);
    winstonLogger.info(l ? `[CMD] [${l}] ${m}` : `[CMD] ${m}`);
  },

  dm(label, message) {
    const { ts, label: l, message: m } = formatMsg("DM", label, message);
    const prefix = l ? chalk.magenta(`[DM] [${l}]`) : chalk.magenta("[DM]");
    console.log(`${chalk.gray(ts)} ${prefix} ${m}`);
    winstonLogger.info(l ? `[DM] [${l}] ${m}` : `[DM] ${m}`);
  },
};

module.exports = logger;
