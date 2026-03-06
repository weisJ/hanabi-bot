import logger from './logger.js';
import fs from 'fs';

export const LOG_AUTO_AVAILABLE = true;
export const LOG_AUTO_AVAILABLE_SEND_MSG = false;

export function logURLDatabase(botname: string, databaseID: number): string {
	return `https://hanabi.jannisweis.de/logs/${botname}/games/${databaseID}.log`;
}

export function logURLTable(botname: string, tableID: number): string {
	return `https://hanabi.jannisweis.de/logs/${botname}/tables/${tableID}.log`;
}

function logDirTables(username: string) {
	return `../logs/${username}/tables`;
}

function logDirGames(username: string) {
	return `../logs/${username}/games`;
}

type BotProxy = {username: string, databaseID: number | undefined, tableID: number | undefined};

export async function ensure_active_log_directory(bot: BotProxy) {
	try {
		const dir = logDirTables(bot.username);
		const path = `${dir}/${bot.tableID}.log`;
		await logger.setFile(dir, path);
	} catch (error) {
		logger.error('Failed to set up file logging:', error);
	}
}

export async function store_game_log(bot: BotProxy) {
	if (bot.databaseID != undefined && bot.databaseID <= 0) {
		console.log(`Failed to save log file. DatabaseID: ${bot.databaseID}`);
		return;
	}
	const tableDir = logDirTables(bot.username);
	const logPath = `${tableDir}/${bot.tableID}.log`;

	if (!fs.existsSync(logPath)) {
		console.log("Log file not found", logPath);
	}

	const dir = logDirGames(bot.username);
	const path = `${dir}/${bot.databaseID}.log`;

	if (fs.existsSync(path)) return;

	await fs.promises.mkdir(dir, { recursive: true });
	await fs.promises.copyFile(logPath, path);
	await fs.promises.rm(logPath);
}

export function store_game_log_sync(bot: BotProxy) {
	if (bot.databaseID != undefined && bot.databaseID < 0) {
		console.log(`Failed to save log file. DatabaseID: ${bot.databaseID}`);
		return;
	}
	const tableDir = logDirTables(bot.username);
	const logPath = `${tableDir}/${bot.tableID}.log`;

	if (!fs.existsSync(logPath)) {
		console.log("Log file not found", logPath);
	}

	const dir = logDirGames(bot.username);
	const path = `${dir}/${bot.databaseID}.log`;

	if (fs.existsSync(path)) return;

	fs.mkdirSync(dir, { recursive: true });
	fs.copyFileSync(logPath, path);
	fs.rmSync(logPath);
}