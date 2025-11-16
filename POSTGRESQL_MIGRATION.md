# Chat UI - PostgreSQL Migration Guide

This document describes the migration from MongoDB to PostgreSQL (Neon) for the Chat UI application.

## Overview

The application has been migrated from MongoDB to PostgreSQL with support for Neon Database. The new setup includes:

- PostgreSQL database backend (compatible with Neon)
- Docker Compose setup for local development
- Automated messaging agents support (Telegram, Instagram, WhatsApp, etc.)
- Dynamic model management via HuggingFace API
- OpenAI-compatible API endpoints

## Database Configuration

### Using Neon PostgreSQL (Production)

Set the `DATABASE_URL` environment variable to your Neon connection string:

```bash
DATABASE_URL=postgresql://neondb_owner:npg_8xHhNa3djgCD@ep-rough-term-ahyldri0-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Using Local PostgreSQL (Development)

1. Start the Docker Compose services:

```bash
docker-compose up -d
```

2. The local PostgreSQL instance will be available at:

```bash
DATABASE_URL=postgresql://chat_user:chat_password@localhost:5432/chat_ui
```

## Database Schema

The database schema is automatically initialized via the `scripts/init-db.sql` file when using Docker Compose. The schema includes:

### Core Tables

- **users** - User accounts and profiles
- **sessions** - User sessions and authentication
- **conversations** - Chat conversations and messages
- **assistants** - AI assistant configurations
- **settings** - User and application settings

### Messaging Agents Tables

- **messaging_agents** - Configuration for automated messaging bots (Telegram, Instagram, etc.)
- **agent_logs** - Logs for messaging agent activities

### Additional Tables

- **shared_conversations** - Shared/public conversations
- **aborted_generations** - Tracking of canceled AI generations
- **message_events** - Message-related events
- **reports** - User reports and feedback
- **conversation_stats** - Analytics data
- **assistant_stats** - Assistant usage statistics
- **files** - File storage (replacement for GridFS)
- **tools** - MCP and other tool configurations
- **config** - Dynamic configuration storage
- **token_caches** - Token caching for performance
- **semaphores** - Distributed locks
- **migration_results** - Database migration tracking

## API Endpoints

### Messaging Agents API

#### List All Agents
```http
GET /api/agents
```

Response:
```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid",
      "name": "Telegram Bot 1",
      "platform": "telegram",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Create New Agent
```http
POST /api/agents
Content-Type: application/json

{
  "name": "My Bot",
  "platform": "telegram",
  "apiToken": "bot_token_here",
  "config": {
    "webhook_url": "https://example.com/webhook",
    "commands": ["/start", "/help"]
  },
  "isActive": true
}
```

#### Get Agent Details
```http
GET /api/agents/{agentId}
```

#### Update Agent
```http
PATCH /api/agents/{agentId}
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": false
}
```

#### Delete Agent
```http
DELETE /api/agents/{agentId}
```

#### Get Agent Logs
```http
GET /api/agents/{agentId}/logs?limit=100&type=error
```

#### Create Agent Log
```http
POST /api/agents/{agentId}/logs
Content-Type: application/json

{
  "logType": "message_sent",
  "logData": {
    "user": "user_123",
    "message": "Hello!",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### Models API

#### List Available Models
```http
GET /api/models
```

This endpoint lists models available via the OpenAI-compatible base URL configured in `OPENAI_BASE_URL`.

## Environment Variables

Update your `.env` file with the following PostgreSQL-related variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_DB_NAME=chat_ui

# OpenAI-Compatible API Configuration
OPENAI_BASE_URL=https://router.huggingface.co/v1
OPENAI_API_KEY=your_api_key_here

# Application Configuration
PUBLIC_APP_NAME=ChatUI
PUBLIC_APP_ASSETS=chatui
COOKIE_NAME=hf-chat
ENABLE_CONFIG_MANAGER=true
LOG_LEVEL=info
```

## Docker Compose Setup

The `docker-compose.yml` file includes:

1. **PostgreSQL Service** - Local database for development
2. **Chat UI Service** - The main application

### Starting Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Migration from MongoDB

The application maintains API compatibility with the MongoDB version through a PostgreSQL adapter layer. Key changes:

1. **ObjectId → UUID**: MongoDB ObjectIds are replaced with PostgreSQL UUIDs
2. **Collection → Table**: MongoDB collections map to PostgreSQL tables
3. **GridFS → Files Table**: File storage moved from GridFS to the `files` table

### Adapter Features

The `PostgresCollection` class provides:
- MongoDB-style query operators (`$in`, `$gt`, `$exists`, etc.)
- Automatic snake_case ↔ camelCase conversion
- Familiar CRUD operations
- Index creation (handled by SQL schema)

## Seed Data

The `init-db.sql` script includes seed data for testing:

- 4 sample users (including admin)
- 3 sample assistants
- 3 messaging agents (Telegram, Instagram, WhatsApp)
- 2 sample conversations with messages
- Sample agent logs

## Development

### Building the Application

```bash
npm install
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Type Checking

```bash
npm run check
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

## MCP Gateway Server

The application is designed to run on an MCP (Model Context Protocol) gateway server with a management agent for:

- Automated maintenance tasks
- Configuration management
- Agent monitoring and health checks
- Model availability tracking

## Automated Messaging Agents

The platform supports integration with multiple messaging platforms:

### Supported Platforms

- **Telegram** - Bot API integration
- **Instagram** - Direct messaging automation
- **WhatsApp** - Business API support
- **Custom** - Extensible for additional platforms

### Agent Configuration

Each agent requires:
- Platform-specific API token
- Webhook URL configuration
- Custom command definitions
- Activity status management

### Agent Logging

All agent activities are logged including:
- Messages received
- Messages sent
- Errors and warnings
- Custom events

## Dynamic Model Management

Models are managed dynamically through:

1. **HuggingFace Router**: Primary model provider
2. **OpenAI-Compatible APIs**: Support for any OpenAI-compatible endpoint
3. **Runtime Configuration**: Models can be added/removed without restarts

### Listing Models

Models are fetched from the configured `OPENAI_BASE_URL` endpoint and exposed via `/api/models`.

## Security Considerations

1. **Database Credentials**: Store securely, never commit to version control
2. **API Tokens**: Encrypt agent API tokens in the database
3. **SSL/TLS**: Always use SSL for production databases (enforced with Neon)
4. **Authentication**: Implement proper user authentication before exposing agent APIs
5. **Rate Limiting**: Consider rate limiting for API endpoints

## Troubleshooting

### Connection Issues

If you can't connect to the database:

1. Verify `DATABASE_URL` is correct
2. Check network connectivity to Neon/PostgreSQL
3. Ensure SSL is properly configured
4. Check PostgreSQL logs: `docker-compose logs postgres`

### Migration Issues

If data needs to be migrated from MongoDB:

1. Export MongoDB data using `mongodump`
2. Transform to PostgreSQL format
3. Import using `psql` or custom migration scripts

### Performance

For better performance:

1. Enable connection pooling (default: 20 connections)
2. Monitor slow queries
3. Add indexes for frequently queried fields
4. Use read replicas for Neon in production

## Support

For issues or questions:

1. Check existing GitHub issues
2. Review Neon PostgreSQL documentation
3. Consult the HuggingFace documentation for model-related questions

## License

Same as the original Chat UI project.
