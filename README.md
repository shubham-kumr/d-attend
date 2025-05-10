# D-Attend

D-Attend is a decentralized attendance and credential management system.

## Project Setup

To set up the project for development:

```bash
# Install dependencies and build all packages
yarn setup
```

## Package Structure

This monorepo contains the following packages:

- **contracts**: Smart contracts for attendance and credential management
- **packages/api**: Backend API built with Express.js and Prisma
- **packages/web**: Frontend built with Next.js
- **packages/common**: Shared utilities across packages

## Development

```bash
# Start development servers for all packages
yarn dev
```

## Testing

```bash
# Run tests across all packages
yarn test
```

## Deployment

See documentation in scripts/deploy for deployment instructions.
