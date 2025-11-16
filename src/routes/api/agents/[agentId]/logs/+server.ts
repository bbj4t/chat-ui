import { json } from "@sveltejs/kit";
import { collections } from "$lib/server/database";
import type { RequestHandler } from "./$types";

/**
 * GET /api/agents/[agentId]/logs - Get logs for a specific agent
 */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { agentId } = params;
		const limit = parseInt(url.searchParams.get("limit") || "100", 10);
		const logType = url.searchParams.get("type");

		const filter: Record<string, unknown> = { agentId };
		if (logType) {
			filter.logType = logType;
		}

		const logs = await collections.agentLogs.find(filter, {
			sort: { createdAt: -1 },
			limit,
		});

		return json({
			success: true,
			logs: logs.map((log) => ({
				id: log._id,
				agentId: log.agentId,
				logType: log.logType,
				logData: log.logData,
				createdAt: log.createdAt,
			})),
		});
	} catch (error) {
		console.error("Error fetching agent logs:", error);
		return json(
			{
				success: false,
				error: "Failed to fetch agent logs",
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/agents/[agentId]/logs - Create a new log entry
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { agentId } = params;
		const body = await request.json();
		const { logType, logData } = body;

		if (!logType) {
			return json(
				{
					success: false,
					error: "Log type is required",
				},
				{ status: 400 }
			);
		}

		const result = await collections.agentLogs.insertOne({
			agentId,
			logType,
			logData: logData || {},
			createdAt: new Date(),
		});

		return json(
			{
				success: true,
				logId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating agent log:", error);
		return json(
			{
				success: false,
				error: "Failed to create agent log",
			},
			{ status: 500 }
		);
	}
};
