import type { ObjectId } from "./ObjectId";

export interface MigrationResult {
	_id: ObjectId;
	name: string;
	status: "success" | "failure" | "ongoing";
}
