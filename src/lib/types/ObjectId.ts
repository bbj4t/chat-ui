/**
 * UUID type to replace MongoDB ObjectId in PostgreSQL implementation
 * This maintains compatibility with the MongoDB-based type structure
 */
export type ObjectId = string;

/**
 * Helper to generate a new UUID (compatible with database auto-generation)
 */
export function generateObjectId(): ObjectId {
	// This is a placeholder - in practice, the database generates UUIDs
	// using uuid_generate_v4()
	return crypto.randomUUID();
}

/**
 * Check if a string is a valid UUID
 */
export function isValidObjectId(id: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}
