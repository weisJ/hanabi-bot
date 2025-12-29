import fs from 'fs';

class Logger {
	LEVELS = /** @type {const} */ ({
		DEBUG: 0,
		INFO: 1,
		WARN: 2,
		ERROR: 3
	});
	levelOverridden = false;
	level = 1;
	active = 0;
	accumulateDepth = 0;

	/** @type {{colour: string, args: string[]}[][]} */
	buffer = [];

	/** @type {string | null} */
	logFilepathDir = null;
	/** @type {string | null} */
	logFilepath = null;

	/** @type {fs.WriteStream | null} */
	fileStream = null;
	/** @type {string | null} */
	fileStreamPath = null;

	constructor() {
		if (process.env['LOG_LEVEL']) {
			this.levelOverridden = true;
			this.level = parseInt(process.env['LOG_LEVEL']);
		}
	}

	/**
	 * Sets the lowest level of logs that will be printed to console.
	 *
	 * For example, setting the level to WARN will suppress DEBUG and INFO logs, and only print WARN and ERROR logs.
	 * @param {number} level
	 */
	setLevel(level) {
		if (!this.levelOverridden)
			this.level = level;
	}

	async ensureFileStream() {
		if (this.fileStream && this.fileStreamPath == this.logFilepath) return;

		await fs.promises.mkdir(this.logFilepathDir, { recursive: true });
		this.fileStreamPath = this.logFilepath;
		if (fs.existsSync(this.fileStreamPath)) {
			await fs.promises.truncate(this.fileStreamPath, 0);
		}
		this.fileStream = fs.createWriteStream(this.logFilepath, { flags: 'a' });
	}

	ensureFileStreamSync() {
		if (this.fileStream && this.fileStreamPath == this.logFilepath) return;

		fs.mkdirSync(this.logFilepathDir, { recursive: true });
		this.fileStreamPath = this.logFilepath;
		this.fileStream = fs.createWriteStream(this.logFilepath, { flags: 'a' });
	}

	/**
	 * Sets the file to write logs to. If null, stops file logging.
	 * @param {string | null} dir
	 * @param {string | null} path
	 */
	async setFile(dir, path) {
		if (dir == this.logFilepathDir && path == this.logFilepath) return;
		if (this.fileStream) {
			this.fileStream.end();
			this.fileStream = null;
			this.fileStreamPath = null;
		}
		this.logFilepathDir = dir;
		this.logFilepath = path;

		if (this.logFilepathDir == null) return;
		await this.ensureFileStream();
	}

	wrapLevel(level, func) {
		const last_level = this.level;
		this.level = level;
		func();
		this.level = last_level;
	}

	log(colour, ...args) {
		if (this.active > 0)
			return;

		if (this.accumulateDepth > 0) {
			// Failsafe
			if (this.buffer[this.accumulateDepth].length > 2000)
				throw new Error('stop. buffer too large');

			if (this.accumulateDepth > 10)
				throw new Error('stop. recursion too deep');

			this.buffer[this.accumulateDepth].push({ colour, args });
		}
		else {
			const colour_code = colour.endsWith('b') ?
				`1;${COLOURS[colour.slice(0, colour.length - 1)]}` :
				COLOURS[colour];

			console.log(`\x1b[${colour_code}m%s`, ...args, '\x1b[0m');

			if (this.logFilepath) {
				this.ensureFileStreamSync();
				const message = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');
				this.fileStream.write(message + '\n');
			}
		}
	}

	debug(...args) {
		if (this.level <= this.LEVELS.DEBUG)
			this.log('purple', ...args);
	}

	info(...args) {
		if (this.level <= this.LEVELS.INFO)
			this.log('white', ...args);
	}

	/**
	 * @param {keyof typeof COLOURS | `${keyof typeof COLOURS}b`} colour
	 * @param {unknown[]} args
	 */
	highlight(colour, ...args) {
		if (this.level <= this.LEVELS.INFO && (COLOURS[colour] || (colour.endsWith('b') && COLOURS[colour.slice(0, colour.length - 1)])))
			this.log(colour, ...args);
	}

	warn(...args) {
		if (this.level <= this.LEVELS.WARN)
			this.log('cyan', ...args);
	}

	error(...args) {
		if (this.level <= this.LEVELS.ERROR)
			this.log('red', ...args);
	}

	on() {
		this.active--;
	}

	off() {
		this.active++;
	}

	/**
	 * Starts collecting logs into a buffer (and does not print them immediately).
	 * Logs can be printed or discarded using flush().
	 */
	collect() {
		this.accumulateDepth++;
		if (this.buffer[this.accumulateDepth] === undefined)
			this.buffer[this.accumulateDepth] = [];
	}

	/**
	 * Flushes the log buffer.
	 * @param {boolean} print 	Whether to print the logs (true) or discard them (false).
	 */
	flush(print = true) {
		this.accumulateDepth--;

		if (this.accumulateDepth < 0)
			throw new Error('Negative accumulateDepth!');

		if (print) {
			for (const log of this.buffer[this.accumulateDepth + 1]) {
				const { colour, args } = log;
				this.log(colour, ...args);
			}
		}
		this.buffer[this.accumulateDepth + 1] = [];
	}
}

const logger = new Logger();
export default logger;

const COLOURS = /** @type {const} */ ({
	gray: 30,
	red: 31,
	green: 32,
	yellow: 33,
	blue: 34,
	purple: 35,
	cyan: 36,
	white: 37
});
