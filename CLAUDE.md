# VIRAL KAR Platform

## Project Overview

VIRAL KAR is a production-grade reward-driven viral marketing platform.

The platform consists of four major applications:

- NestJS Backend
- Flutter Mobile App
- React Merchant Portal
- React Admin Portal

The repository is managed as a monorepo.

Current Tech Stack

Backend
- NestJS
- TypeScript
- Prisma ORM
- MySQL
- JWT Authentication
- Redis
- BullMQ
- Nodemailer
- Winston Logging
- Swagger
- Class Validator
- Class Transformer

Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- React Query
- React Router
- React Hook Form

Mobile
- Flutter
- Riverpod
- Go Router
- Dio

AI Services
- Python
- FastAPI
- LangChain
- OpenAI compatible APIs

---

# Important Project Decisions

These decisions are permanent unless explicitly changed.

## Database

Database is MySQL.

Never migrate to PostgreSQL.

Never generate PostgreSQL-specific SQL.

Always generate MySQL-compatible Prisma schema.

Use UUID for every primary key.

Use soft delete wherever applicable.

Use Prisma as the only ORM.

---

## Storage

DO NOT use AWS S3.

DO NOT use MinIO.

DO NOT generate S3 upload code.

DO NOT create StorageService using cloud providers.

Files should be stored locally under:

uploads/

Organize uploads into:

uploads/

images/

documents/

kyc/

campaigns/

submissions/

avatars/

receipts/

Use NestJS ServeStaticModule for serving uploaded files.

---

## Authentication

Authentication uses:

JWT Access Token

JWT Refresh Token

OTP Verification

Role Based Access Control (RBAC)

Device Tracking

Session Tracking

Login History

Password Hashing

Refresh Tokens stored hashed.

---

## Backend Architecture

Always follow Feature Module architecture.

Every module must contain:

controller

service

repository (if required)

dto

entities

interfaces

constants

validators

guards

decorators

events (if needed)

Never create business logic inside controllers.

Controllers only validate requests and call services.

Business logic belongs only inside services.

Database logic belongs in PrismaService or repositories.

---

## API Standards

Every API response must follow the global response format.

Never return raw Prisma objects.

Use DTOs.

Use ValidationPipe.

Use Response Interceptor.

Use Global Exception Filter.

Use Prisma Exception Filter.

---

## Logging

Use Winston only.

Never use console.log.

Log:

API requests

Errors

Authentication

Critical business events

Background jobs

---

## Error Handling

Use AppException hierarchy.

Never throw generic Error.

Use domain-specific exceptions.

Return consistent error responses.

---

## Prisma Rules

Whenever schema changes:

Update schema.prisma

Generate migration

Update DTOs

Update Services

Update Swagger

Update Validation

Update Seed Data

Never leave schema partially updated.

Always validate relations before editing.

---

## Redis

Redis is used for:

Caching

OTP

Rate Limiting

BullMQ

Session blacklist

Never store permanent data inside Redis.

---

## Background Jobs

BullMQ queues:

Email Queue

Notification Queue

Campaign Queue

Reward Queue

AI Queue

Withdrawal Queue

Always create processors separately.

Jobs must be idempotent.

---

## Code Quality

Always follow:

SOLID

DRY

KISS

Clean Architecture

Domain Driven Design where applicable.

Prefer composition over inheritance.

Avoid duplicate code.

---

## Naming Conventions

Use PascalCase:

Classes

DTOs

Interfaces

Enums

Use camelCase:

variables

methods

properties

Use kebab-case:

folders

Use snake_case only inside MySQL table names.

---

## Validation

Use class-validator.

Never trust client input.

Validate every request.

Sanitize strings.

Trim whitespace.

Reject unknown fields.

---

## Security

Always:

Validate JWT

Hash passwords using bcrypt

Rate limit authentication endpoints

Validate uploaded files

Escape SQL automatically via Prisma

Never expose internal IDs

Never expose stack traces

Never expose secrets

---

## Documentation

Every public class must include documentation.

Every service method should have clear comments.

Complex business logic should explain WHY, not WHAT.

---

## Frontend Standards

React

Use:

Feature based architecture

Tailwind CSS for styling

React Query

Axios

Reusable components

Hooks

Protected Routes

Lazy loading

Never duplicate components.

---

## Flutter Standards

Use:

Riverpod

GoRouter

Repository Pattern

Feature folders

Dio

Freezed

Json Serializable

Never place API logic inside UI.

---

## Git Rules

Never delete working code.

Never rewrite unrelated modules.

Modify only affected files.

Before major refactoring:

Analyze the whole project.

Provide a summary.

Explain risks.

List modified files.

---

## Before Writing Code

Always:

1. Analyze existing architecture.
2. Search for similar implementations.
3. Reuse existing code.
4. Avoid duplicate implementations.
5. Preserve backward compatibility.

---

## After Completing Any Task

Always provide:

Summary

Files modified

Architecture impact

Possible risks

Suggested improvements

Next recommended task

---

## Current Project Progress

Completed:

- Complete monorepo architecture
- Prisma foundation
- Identity & Access Management schema
- Merchant domain schema
- Campaign domain schema
- Task & Submission domain schema
- Wallet & Financial domain schema
- Notification & Support domain schema
- Analytics & Audit domain schema
- Infrastructure foundation
- Winston logging
- Redis integration
- BullMQ setup
- Mail module
- Global exception handling
- Global validation
- Config module
- Prisma service
- Health module

Current Focus:

Complete the NestJS backend until production-ready status.

Priority Order:

1. Backend modules
2. Authentication
3. Merchant APIs
4. Campaign APIs
5. Task APIs
6. Wallet APIs
7. Admin APIs
8. Mobile APIs
9. Merchant Portal
10. Admin Portal
11. Flutter App
12. AI Services

---

## AI Coding Behavior

Before making changes:

- Analyze the complete codebase.
- Understand dependencies.
- Check for existing implementations.
- Reuse code whenever possible.
- Do not introduce breaking changes.

When implementing a feature:

- Update all affected files.
- Keep architecture consistent.
- Ensure the project compiles.
- Do not leave incomplete implementations.

If uncertain:

- Explain the issue first.
- Propose the best approach.
- Wait for confirmation before making destructive changes.