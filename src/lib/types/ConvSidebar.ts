import type { ObjectId } from "./ObjectId";

export interface ConvSidebar {
	id: ObjectId | string;
	title: string;
	updatedAt: Date;
	model?: string;
	avatarUrl?: string | Promise<string | undefined>;
}
