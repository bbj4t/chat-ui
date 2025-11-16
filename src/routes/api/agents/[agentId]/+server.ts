import { json } from "@sveltejs/kit";
import { collections } from "$lib/server/database";
import type { RequestHandler } from "./$types";

/**
 * GET /api/agents/[agentId] - Get a specific messaging agent
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { agentId } = params;

		const agent = await collections.messagingAgents.findOne({ _id: agentId });

		if (!agent) {
			return json(
				{
					success: false,
					error: "Agent not found",
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			agent: {
				id: agent._id,
				name: agent.name,
				platform: agent.platform,
				config: agent.config,
				isActive: agent.isActive,
				createdAt: agent.createdAt,
				updatedAt: agent.updatedAt,
			},
		});
	} catch (error) {
		console.error("Error fetching agent:", error);
		return json(
			{
				success: false,
				error: "Failed to fetch agent",
			},
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/agents/[agentId] - Update a messaging agent
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const { agentId } = params;
		const body = await request.json();
		const { name, platform, apiToken, config, isActive } = body;

		const updateFields: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if (name !== undefined) updateFields.name = name;
		if (platform !== undefined) updateFields.platform = platform;
		if (apiToken !== undefined) updateFields.apiToken = apiToken;
		if (config !== undefined) updateFields.config = config;
		if (isActive !== undefined) updateFields.isActive = isActive;

		const result = await collections.messagingAgents.updateOne(
			{ _id: agentId },
			{ $set: updateFields }
		);

		if (result.modifiedCount === 0) {
			return json(
				{
					success: false,
					error: "Agent not found",
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			message: "Agent updated successfully",
		});
	} catch (error) {
		console.error("Error updating agent:", error);
		return json(
			{
				success: false,
				error: "Failed to update agent",
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/agents/[agentId] - Delete a messaging agent
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { agentId } = params;

		const result = await collections.messagingAgents.deleteOne({ _id: agentId });

		if (result.deletedCount === 0) {
			return json(
				{
					success: false,
					error: "Agent not found",
				},
				{ status: 404 }
			);
		}

		// Also delete associated logs
		await collections.agentLogs.deleteMany({ agentId });

		return json({
			success: true,
			message: "Agent deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting agent:", error);
		return json(
			{
				success: false,
				error: "Failed to delete agent",
			},
			{ status: 500 }
		);
	}
};
