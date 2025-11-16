/**
 * Type definitions for PostgreSQL collection operations
 */

export interface FindOptions {
	sort?: Record<string, 1 | -1>;
	limit?: number;
	skip?: number;
}

export interface UpdateOptions {
	upsert?: boolean;
}

export interface MongoFilter {
	[key: string]: unknown | MongoOperators;
}

export interface MongoOperators {
	$exists?: boolean;
	$in?: unknown[];
	$gt?: unknown;
	$gte?: unknown;
	$lt?: unknown;
	$lte?: unknown;
	$ne?: unknown;
}

export interface UpdateQuery {
	$set?: Record<string, unknown>;
	$setOnInsert?: Record<string, unknown>;
	[key: string]: unknown;
}
