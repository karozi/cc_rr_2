# Reddit Outreach Agent

## Overview

This is a Reddit Outreach Agent - an AI-powered monitoring system that tracks Reddit discussions across specified subreddits and generates intelligent responses for community engagement. The application features a React frontend dashboard with real-time monitoring capabilities and an Express.js backend that integrates with Reddit's API and OpenAI for automated content analysis and reply generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern React application using TypeScript for type safety
- **shadcn/ui Component Library**: Comprehensive UI component system based on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling with custom design system variables
- **Vite Build System**: Fast development and build tooling optimized for modern web development
- **React Query (TanStack Query)**: Server state management and caching for API interactions
- **Wouter Router**: Lightweight client-side routing solution

### Backend Architecture
- **Express.js Server**: RESTful API server handling Reddit monitoring and AI response generation
- **WebSocket Integration**: Real-time communication for live monitoring updates and notifications
- **Service Layer Pattern**: Modular services for Reddit API integration, OpenAI interactions, and monitoring logic
- **In-Memory Storage**: Temporary data storage using Map-based storage implementation (designed for database integration)
- **Middleware Architecture**: Custom middleware for authentication, validation, and request handling

### Data Storage Design
- **Drizzle ORM**: Type-safe database schema and query builder
- **PostgreSQL Schema**: Structured data models for users, posts, monitoring configurations, and knowledge base
- **Migration System**: Version-controlled database schema management through Drizzle Kit

### Real-time Communication
- **WebSocket Server**: Bidirectional communication for live monitoring status updates
- **Event Broadcasting**: Real-time notifications for new post discoveries and system status changes
- **Connection Management**: Automatic reconnection and connection state handling

### AI Integration Architecture
- **OpenAI GPT-4o Integration**: Advanced language model for generating contextual Reddit replies
- **Knowledge Base System**: Dynamic content repository for improving AI response quality
- **Confidence Scoring**: AI-generated confidence metrics for response quality assessment
- **Prompt Engineering**: Structured prompts optimized for Reddit community engagement

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity optimized for serverless environments
- **express**: Web application framework for Node.js API development
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **ws**: WebSocket library for real-time bidirectional communication

### Frontend UI Framework
- **@radix-ui/***: Comprehensive collection of low-level UI primitives (accordion, dialog, dropdown, toast, etc.)
- **@tanstack/react-query**: Server state management and data fetching
- **class-variance-authority**: Utility for creating variant-based component APIs
- **clsx** & **tailwindcss**: CSS styling and utility management

### Authentication & Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **express-session**: Server-side session management middleware

### Development & Build Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution engine for development
- **esbuild**: JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Replit-specific development enhancements

### External API Integrations
- **Reddit API**: Content monitoring and posting capabilities (requires client credentials and refresh token)
- **OpenAI API**: GPT-4o model access for AI-powered response generation (requires API key)

### Data Validation & Schemas
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation
- **zod**: Runtime type validation and schema definition
- **@hookform/resolvers**: Form validation integration for React Hook Form