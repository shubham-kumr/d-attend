#!/bin/bash
echo "📦 Setting up D-Attend project..."

# Install root dependencies and bootstrap packages
echo "🔧 Installing root dependencies and bootstrapping packages..."
yarn install
npx lerna bootstrap

# Add ts-node to contracts package
echo "🔧 Adding ts-node to contracts package..."
cd contracts
yarn add --dev ts-node
cd ..

# Create Prisma schema with datasource and model
echo "🔧 Setting up Prisma schema..."
cat > packages/api/prisma/schema.prisma << 'EOL'
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add your models here
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
EOL

# Create .env file for API package
echo "🔧 Creating .env file for API package..."
cat > packages/api/.env << 'EOL'
# For development, you can use PostgreSQL with Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dattend?schema=public"
JWT_SECRET="your-secret-key"
PORT=3001
EOL

# Create Next.js app layout
echo "🔧 Creating Next.js root layout..."
mkdir -p packages/web/src/app
cat > packages/web/src/app/layout.tsx << 'EOL'
import '../styles/globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'D-Attend',
  description: 'Decentralized attendance and credential management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
EOL

# Create globals.css
echo "🔧 Creating global CSS file..."
mkdir -p packages/web/src/styles
cat > packages/web/src/styles/globals.css << 'EOL'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOL

# Build common package first as other packages might depend on it
echo "🔧 Building common package..."
cd packages/common
yarn build
cd ../..

# Set up Prisma for API package
echo "🔧 Setting up API package..."
cd packages/api
npx prisma generate
# Uncomment the following line when you have a database setup
# npx prisma migrate dev --name init
cd ../..

# Build contracts
echo "🔧 Building contracts..."
cd contracts
yarn build
cd ..

# Build all packages in the correct order
echo "🔧 Building all packages..."
npx lerna run build --stream

echo "✅ Setup complete! Your D-Attend project is ready for development."
