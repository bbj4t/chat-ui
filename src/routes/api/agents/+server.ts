import { json } from "@sveltejs/kit";
import { collections } from "$lib/server/database";
import type { RequestHandler } from "./$types";

/**
 * GET /api/agents - List all messaging agents
 */
export const GET: RequestHandler = async () => {
	try {
		const agents = await collections.messagingAgents.find({});
		return json({
			success: true,
			agents: agents.map((agent) => ({
				id: agent._id,
				name: agent.name,
				platform: agent.platform,
				isActive: agent.isActive,
				createdAt: agent.createdAt,
				updatedAt: agent.updatedAt,
			})),
		});
	} catch (error) {
		console.error("Error fetching agents:", error);
		return json(
			{
				success: false,
				error: "Failed to fetch agents",
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/agents - Create a new messaging agent
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, platform, apiToken, config, isActive } = body;

		if (!name || !platform) {
			return json(
				{
					success: false,
					error: "Name and platform are required",
				},
				{ status: 400 }
			);
		}

		const result = await collections.messagingAgents.insertOne({
			name,
			platform,
			apiToken: apiToken || null,
			config: config || {},
			isActive: isActive !== undefined ? isActive : true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return json(
			{
				success: true,
				agentId: result.insertedId,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating agent:", error);
		return json(
			{
				success: false,
				error: "Failed to create agent",
			},
			{ status: 500 }
		);
	}
};
