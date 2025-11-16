import { Pool } from "pg";
import type { Conversation } from "$lib/types/Conversation";
import type { SharedConversation } from "$lib/types/SharedConversation";
import type { AbortedGeneration } from "$lib/types/AbortedGeneration";
import type { Settings } from "$lib/types/Settings";
import type { User } from "$lib/types/User";
import type { MessageEvent } from "$lib/types/MessageEvent";
import type { Session } from "$lib/types/Session";
import type { Assistant } from "$lib/types/Assistant";
import type { Report } from "$lib/types/Report";
import type { ConversationStats } from "$lib/types/ConversationStats";
import type { MigrationResult } from "$lib/types/MigrationResult";
import type { Semaphore } from "$lib/types/Semaphore";
import type { AssistantStats } from "$lib/types/AssistantStats";
import { logger } from "$lib/server/logger";
import { building } from "$app/environment";
import type { TokenCache } from "$lib/types/TokenCache";
import { onExit } from "./exitHandler";
import type { ConfigKey } from "$lib/types/ConfigKey";
import { config } from "$lib/server/config";
import type { FindOptions, UpdateOptions, MongoFilter, UpdateQuery } from "./database-types";

export const CONVERSATION_STATS_COLLECTION = "conversation_stats";

export class Database {
	private pool?: Pool;

	private static instance: Database;

	private async init() {
		const databaseUrl =
			config.DATABASE_URL ||
			process.env.DATABASE_URL ||
			"postgresql://chat_user:chat_password@localhost:5432/chat_ui";

		if (!databaseUrl) {
			logger.error("No DATABASE_URL found in configuration");
			process.exit(1);
		}

		try {
			logger.info("Connecting to PostgreSQL database");
			this.pool = new Pool({
				connectionString: databaseUrl,
				max: 20, // Maximum number of clients in the pool
				idleTimeoutMillis: 30000,
				connectionTimeoutMillis: 10000,
			});

			// Test the connection
			const client = await this.pool.connect();
			logger.info("Connected to PostgreSQL database");
			client.release();

			await this.initDatabase();
		} catch (err) {
			logger.error(err, "Connection error");
			process.exit(1);
		}

		// Disconnect DB on exit
		onExit(async () => {
			logger.info("Closing database connection");
			await this.pool?.end();
		});
	}

	public static async getInstance(): Promise<Database> {
		if (!Database.instance) {
			Database.instance = new Database();
			await Database.instance.init();
		}

		return Database.instance;
	}

	/**
	 * Return postgres pool
	 */
	public getPool(): Pool {
		if (!this.pool) {
			throw new Error("Database not initialized");
		}

		return this.pool;
	}

	/**
	 * Return map of database's collections (PostgreSQL adapter)
	 */
	public getCollections() {
		if (!this.pool) {
			throw new Error("Database not initialized");
		}

		return {
			conversations: new PostgresCollection<Conversation>(this.pool, "conversations"),
			conversationStats: new PostgresCollection<ConversationStats>(
				this.pool,
				CONVERSATION_STATS_COLLECTION
			),
			assistants: new PostgresCollection<Assistant>(this.pool, "assistants"),
			assistantStats: new PostgresCollection<AssistantStats>(this.pool, "assistant_stats"),
			reports: new PostgresCollection<Report>(this.pool, "reports"),
			sharedConversations: new PostgresCollection<SharedConversation>(
				this.pool,
				"shared_conversations"
			),
			abortedGenerations: new PostgresCollection<AbortedGeneration>(
				this.pool,
				"aborted_generations"
			),
			settings: new PostgresCollection<Settings>(this.pool, "settings"),
			users: new PostgresCollection<User>(this.pool, "users"),
			sessions: new PostgresCollection<Session>(this.pool, "sessions"),
			messageEvents: new PostgresCollection<MessageEvent>(this.pool, "message_events"),
			bucket: new PostgresFileBucket(this.pool),
			migrationResults: new PostgresCollection<MigrationResult>(this.pool, "migration_results"),
			semaphores: new PostgresCollection<Semaphore>(this.pool, "semaphores"),
			tokenCaches: new PostgresCollection<TokenCache>(this.pool, "token_caches"),
			tools: new PostgresCollection(this.pool, "tools"),
			config: new PostgresCollection<ConfigKey>(this.pool, "config"),
			messagingAgents: new PostgresCollection(this.pool, "messaging_agents"),
			agentLogs: new PostgresCollection(this.pool, "agent_logs"),
		};
	}

	/**
	 * Init database once connected: Index creation (already handled by init-db.sql)
	 * @private
	 */
	private async initDatabase() {
		logger.info("Database schema should be initialized via init-db.sql script");
		// Indexes are created in the SQL initialization script
		// This method is kept for compatibility but doesn't need to do anything
		// since PostgreSQL schema is managed via SQL migrations
	}
}

/**
 * PostgreSQL Collection Adapter to mimic MongoDB collection interface
 */
export class PostgresCollection<T = Record<string, unknown>> {
	constructor(
		private pool: Pool,
		private tableName: string
	) {}

	/**
	 * Find documents matching a filter
	 */
	async find(filter: MongoFilter = {}, options: FindOptions = {}): Promise<T[]> {
		const client = await this.pool.connect();
		try {
			const { whereClause, values } = this.buildWhereClause(filter);
			let query = `SELECT * FROM ${this.tableName}`;

			if (whereClause) {
				query += ` WHERE ${whereClause}`;
			}

			if (options.sort) {
				const sortClauses = Object.entries(options.sort)
					.map(([key, dir]) => `${this.toSnakeCase(key)} ${dir === -1 ? "DESC" : "ASC"}`)
					.join(", ");
				query += ` ORDER BY ${sortClauses}`;
			}

			if (options.limit) {
				query += ` LIMIT ${options.limit}`;
			}

			if (options.skip) {
				query += ` OFFSET ${options.skip}`;
			}

			const result = await client.query(query, values);
			return result.rows.map((row) => this.rowToDocument(row));
		} finally {
			client.release();
		}
	}

	/**
	 * Find one document matching a filter
	 */
	async findOne(filter: MongoFilter = {}): Promise<T | null> {
		const results = await this.find(filter, { limit: 1 });
		return results[0] || null;
	}

	/**
	 * Insert a single document
	 */
	async insertOne(document: Partial<T>): Promise<{ insertedId: string }> {
		const client = await this.pool.connect();
		try {
			const doc = this.documentToRow(document);
			const columns = Object.keys(doc);
			const values = Object.values(doc);
			const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

			const query = `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`;
			const result = await client.query(query, values);
			return { insertedId: result.rows[0].id };
		} finally {
			client.release();
		}
	}

	/**
	 * Insert multiple documents
	 */
	async insertMany(documents: Partial<T>[]): Promise<{ insertedIds: string[] }> {
		const insertedIds: string[] = [];
		for (const doc of documents) {
			const result = await this.insertOne(doc);
			insertedIds.push(result.insertedId);
		}
		return { insertedIds };
	}

	/**
	 * Update documents matching a filter
	 */
	async updateOne(
		filter: MongoFilter,
		update: UpdateQuery,
		_options: UpdateOptions = {}
	): Promise<{ modifiedCount: number }> {
		const client = await this.pool.connect();
		try {
			const { whereClause, values: whereValues } = this.buildWhereClause(filter);
			const updateDoc = update.$set || update;
			const updateRow = this.documentToRow(updateDoc, true);

			const setClauses: string[] = [];
			const setValues: unknown[] = [];
			let paramIndex = whereValues.length + 1;

			Object.entries(updateRow).forEach(([key, value]) => {
				setClauses.push(`${key} = $${paramIndex}`);
				setValues.push(value);
				paramIndex++;
			});

			let query = `UPDATE ${this.tableName} SET ${setClauses.join(", ")}`;
			if (whereClause) {
				query += ` WHERE ${whereClause}`;
			}

			const result = await client.query(query, [...whereValues, ...setValues]);
			return { modifiedCount: result.rowCount || 0 };
		} finally {
			client.release();
		}
	}

	/**
	 * Update multiple documents matching a filter
	 */
	async updateMany(filter: MongoFilter, update: UpdateQuery): Promise<{ modifiedCount: number }> {
		return this.updateOne(filter, update);
	}

	/**
	 * Delete documents matching a filter
	 */
	async deleteOne(filter: MongoFilter): Promise<{ deletedCount: number }> {
		const client = await this.pool.connect();
		try {
			const { whereClause, values } = this.buildWhereClause(filter);
			let query = `DELETE FROM ${this.tableName}`;
			if (whereClause) {
				query += ` WHERE ${whereClause}`;
			}
			query += ` LIMIT 1`;

			const result = await client.query(query, values);
			return { deletedCount: result.rowCount || 0 };
		} finally {
			client.release();
		}
	}

	/**
	 * Delete multiple documents matching a filter
	 */
	async deleteMany(filter: MongoFilter): Promise<{ deletedCount: number }> {
		const client = await this.pool.connect();
		try {
			const { whereClause, values } = this.buildWhereClause(filter);
			let query = `DELETE FROM ${this.tableName}`;
			if (whereClause) {
				query += ` WHERE ${whereClause}`;
			}

			const result = await client.query(query, values);
			return { deletedCount: result.rowCount || 0 };
		} finally {
			client.release();
		}
	}

	/**
	 * Count documents matching a filter
	 */
	async countDocuments(filter: MongoFilter = {}): Promise<number> {
		const client = await this.pool.connect();
		try {
			const { whereClause, values } = this.buildWhereClause(filter);
			let query = `SELECT COUNT(*) FROM ${this.tableName}`;
			if (whereClause) {
				query += ` WHERE ${whereClause}`;
			}

			const result = await client.query(query, values);
			return parseInt(result.rows[0].count, 10);
		} finally {
			client.release();
		}
	}

	/**
	 * Create index (no-op for PostgreSQL as indexes are in schema)
	 */
	async createIndex(
		_keys: Record<string, unknown>,
		_options: Record<string, unknown> = {}
	): Promise<string> {
		// Indexes are created in SQL schema, this is a no-op for compatibility
		return "index_created_in_schema";
	}

	/**
	 * Build WHERE clause from MongoDB-style filter
	 */
	private buildWhereClause(filter: MongoFilter): { whereClause: string; values: unknown[] } {
		const clauses: string[] = [];
		const values: unknown[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(filter)) {
			const columnName = this.toSnakeCase(key);

			if (value && typeof value === "object" && !Array.isArray(value)) {
				// Handle operators
				const objValue = value as Record<string, unknown>;
				if (objValue.$exists !== undefined) {
					clauses.push(`${columnName} IS ${objValue.$exists ? "NOT NULL" : "NULL"}`);
				} else if (objValue.$in) {
					const inValues = objValue.$in as unknown[];
					const placeholders = inValues.map(() => `$${paramIndex++}`).join(", ");
					clauses.push(`${columnName} IN (${placeholders})`);
					values.push(...inValues);
				} else if (objValue.$gt !== undefined) {
					clauses.push(`${columnName} > $${paramIndex++}`);
					values.push(objValue.$gt);
				} else if (objValue.$gte !== undefined) {
					clauses.push(`${columnName} >= $${paramIndex++}`);
					values.push(objValue.$gte);
				} else if (objValue.$lt !== undefined) {
					clauses.push(`${columnName} < $${paramIndex++}`);
					values.push(objValue.$lt);
				} else if (objValue.$lte !== undefined) {
					clauses.push(`${columnName} <= $${paramIndex++}`);
					values.push(objValue.$lte);
				} else if (objValue.$ne !== undefined) {
					clauses.push(`${columnName} != $${paramIndex++}`);
					values.push(objValue.$ne);
				}
			} else {
				clauses.push(`${columnName} = $${paramIndex++}`);
				values.push(value);
			}
		}

		return {
			whereClause: clauses.join(" AND "),
			values,
		};
	}

	/**
	 * Convert camelCase to snake_case
	 */
	private toSnakeCase(str: string): string {
		// Handle _id specially
		if (str === "_id") return "id";
		return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
	}

	/**
	 * Convert snake_case to camelCase
	 */
	private toCamelCase(str: string): string {
		if (str === "id") return "_id";
		return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
	}

	/**
	 * Convert database row to document format
	 */
	private rowToDocument(row: Record<string, unknown>): T {
		const doc: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(row)) {
			const camelKey = this.toCamelCase(key);
			doc[camelKey] = value;
		}
		return doc as T;
	}

	/**
	 * Convert document to database row format
	 */
	private documentToRow(
		doc: Partial<T> | Record<string, unknown>,
		isUpdate = false
	): Record<string, unknown> {
		const row: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(doc)) {
			if (key === "_id" && !isUpdate) continue; // Skip _id on insert
			const snakeKey = this.toSnakeCase(key);
			row[snakeKey] = value;
		}
		return row;
	}

	/**
	 * Aggregate (simplified implementation)
	 */
	async aggregate(_pipeline: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
		// This is a simplified implementation
		// Complex aggregations need to be handled on a case-by-case basis
		logger.warn("Aggregate is not fully implemented for PostgreSQL adapter");
		return [];
	}
}

/**
 * PostgreSQL File Bucket Adapter to mimic GridFS
 */
export class PostgresFileBucket {
	constructor(private pool: Pool) {}

	async uploadFromStream(filename: string, stream: NodeJS.ReadableStream): Promise<string> {
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(chunk as Buffer);
		}
		const buffer = Buffer.concat(chunks);

		const client = await this.pool.connect();
		try {
			const query = `INSERT INTO files (filename, data, size) VALUES ($1, $2, $3) RETURNING id`;
			const result = await client.query(query, [filename, buffer, buffer.length]);
			return result.rows[0].id;
		} finally {
			client.release();
		}
	}

	async openDownloadStream(fileId: string): Promise<Buffer> {
		const client = await this.pool.connect();
		try {
			const query = `SELECT data FROM files WHERE id = $1`;
			const result = await client.query(query, [fileId]);
			if (result.rows.length === 0) {
				throw new Error("File not found");
			}
			return result.rows[0].data as Buffer;
		} finally {
			client.release();
		}
	}

	async delete(fileId: string): Promise<void> {
		const client = await this.pool.connect();
		try {
			const query = `DELETE FROM files WHERE id = $1`;
			await client.query(query, [fileId]);
		} finally {
			client.release();
		}
	}
}

export let collections: ReturnType<typeof Database.prototype.getCollections>;

export const ready = (async () => {
	if (!building) {
		const db = await Database.getInstance();
		collections = db.getCollections();
	} else {
		collections = {} as unknown as ReturnType<typeof Database.prototype.getCollections>;
	}
})();

export async function getCollectionsEarly(): Promise<
	ReturnType<typeof Database.prototype.getCollections>
> {
	await ready;
	if (!collections) {
		throw new Error("Database not initialized");
	}
	return collections;
}
