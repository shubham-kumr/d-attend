import { PrismaClient, Role, AttendanceStatus } from '@prisma/client';
import { ethers } from 'ethers';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Helper function to generate random nonce
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

// Helper function to generate a deterministic proof hash
function generateProofHash(userId: string, serverId: string, timestamp: Date) {
  const message = `${userId}|${serverId}|${timestamp.toISOString()}`;
  return ethers.utils.id(message);
}

async function main() {
  console.log('Starting database seed...');

  try {
    // Clean up existing data (in reverse order of dependencies)
    await prisma.credential.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.userOrganization.deleteMany();
    await prisma.server.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    console.log('Existing data cleaned up');

    // Create users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          nonce: generateNonce(),
          profilePicture: 'https://i.pravatar.cc/300?u=alice'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Bob Smith',
          email: 'bob@example.com',
          walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          nonce: generateNonce(),
          profilePicture: 'https://i.pravatar.cc/300?u=bob'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Charlie Brown',
          email: 'charlie@example.com',
          walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          nonce: generateNonce(),
          profilePicture: 'https://i.pravatar.cc/300?u=charlie'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Diana Prince',
          email: 'diana@example.com',
          walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          nonce: generateNonce(),
          profilePicture: 'https://i.pravatar.cc/300?u=diana'
        }
      }),
      prisma.user.create({
        data: {
          name: 'Edward Norton',
          email: 'edward@example.com',
          walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
          nonce: generateNonce(),
          profilePicture: 'https://i.pravatar.cc/300?u=edward'
        }
      })
    ]);

    console.log('Created users:', users.length);

    // Create organizations
    const organizations = await Promise.all([
      prisma.organization.create({
        data: {
          name: 'TechCorp',
          description: 'A leading technology company',
          logoUrl: 'https://via.placeholder.com/150?text=TechCorp',
          walletAddress: '0x1CBd3b2ec592f48eb9454c105BA6466221996e67',
          isVerified: true
        }
      }),
      prisma.organization.create({
        data: {
          name: 'EduLearn',
          description: 'Educational platform for tech learning',
          logoUrl: 'https://via.placeholder.com/150?text=EduLearn',
          walletAddress: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
          isVerified: true
        }
      }),
      prisma.organization.create({
        data: {
          name: 'FinTrust',
          description: 'Financial services provider',
          logoUrl: 'https://via.placeholder.com/150?text=FinTrust',
          walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
          isVerified: false
        }
      })
    ]);

    console.log('Created organizations:', organizations.length);

    // Create user-organization relationships
    const userOrganizations = await Promise.all([
      // Alice is the owner of TechCorp
      prisma.userOrganization.create({
        data: {
          userId: users[0].id,
          organizationId: organizations[0].id,
          role: Role.OWNER
        }
      }),
      // Bob is an admin at TechCorp
      prisma.userOrganization.create({
        data: {
          userId: users[1].id,
          organizationId: organizations[0].id,
          role: Role.ADMIN
        }
      }),
      // Charlie is a member at TechCorp
      prisma.userOrganization.create({
        data: {
          userId: users[2].id,
          organizationId: organizations[0].id,
          role: Role.MEMBER
        }
      }),
      // Bob is the owner of EduLearn
      prisma.userOrganization.create({
        data: {
          userId: users[1].id,
          organizationId: organizations[1].id,
          role: Role.OWNER
        }
      }),
      // Diana is an admin at EduLearn
      prisma.userOrganization.create({
        data: {
          userId: users[3].id,
          organizationId: organizations[1].id,
          role: Role.ADMIN
        }
      }),
      // Edward is a member at EduLearn
      prisma.userOrganization.create({
        data: {
          userId: users[4].id,
          organizationId: organizations[1].id,
          role: Role.MEMBER
        }
      }),
      // Diana is the owner of FinTrust
      prisma.userOrganization.create({
        data: {
          userId: users[3].id,
          organizationId: organizations[2].id,
          role: Role.OWNER
        }
      })
    ]);

    console.log('Created user-organization relationships:', userOrganizations.length);

    // Create servers
    const servers = await Promise.all([
      // TechCorp servers
      prisma.server.create({
        data: {
          name: 'TechCorp HQ',
          description: 'Main headquarters attendance server',
          location: 'Building A, Floor 1',
          organizationId: organizations[0].id
        }
      }),
      prisma.server.create({
        data: {
          name: 'TechCorp R&D Lab',
          description: 'Research and Development department',
          location: 'Building B, Floor 2',
          organizationId: organizations[0].id
        }
      }),
      // EduLearn servers
      prisma.server.create({
        data: {
          name: 'EduLearn Main Campus',
          description: 'Main campus attendance tracking',
          location: 'Campus Center, Room 101',
          organizationId: organizations[1].id
        }
      }),
      // FinTrust servers
      prisma.server.create({
        data: {
          name: 'FinTrust Office',
          description: 'Main office attendance',
          location: 'Financial District, Tower 3',
          organizationId: organizations[2].id
        }
      })
    ]);

    console.log('Created servers:', servers.length);

    // Create attendance records
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

    const attendances = await Promise.all([
      // Charlie's attendance at TechCorp HQ - completed
      prisma.attendance.create({
        data: {
          userId: users[2].id,
          serverId: servers[0].id,
          checkInTime: dayBeforeYesterday,
          checkOutTime: new Date(dayBeforeYesterday.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
          status: AttendanceStatus.COMPLETED,
          proofHash: generateProofHash(users[2].id, servers[0].id, dayBeforeYesterday)
        }
      }),
      // Charlie's attendance at TechCorp HQ - yesterday, completed
      prisma.attendance.create({
        data: {
          userId: users[2].id,
          serverId: servers[0].id,
          checkInTime: yesterday,
          checkOutTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
          status: AttendanceStatus.COMPLETED,
          proofHash: generateProofHash(users[2].id, servers[0].id, yesterday)
        }
      }),
      // Charlie's attendance at TechCorp HQ - today, active
      prisma.attendance.create({
        data: {
          userId: users[2].id,
          serverId: servers[0].id,
          checkInTime: now,
          status: AttendanceStatus.ACTIVE,
          proofHash: generateProofHash(users[2].id, servers[0].id, now)
        }
      }),
      // Edward's attendance at EduLearn - completed
      prisma.attendance.create({
        data: {
          userId: users[4].id,
          serverId: servers[2].id,
          checkInTime: yesterday,
          checkOutTime: new Date(yesterday.getTime() + 6 * 60 * 60 * 1000), // 6 hours later
          status: AttendanceStatus.COMPLETED,
          proofHash: generateProofHash(users[4].id, servers[2].id, yesterday)
        }
      }),
      // Diana's attendance at FinTrust - cancelled
      prisma.attendance.create({
        data: {
          userId: users[3].id,
          serverId: servers[3].id,
          checkInTime: yesterday,
          checkOutTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
          status: AttendanceStatus.CANCELLED,
          proofHash: generateProofHash(users[3].id, servers[3].id, yesterday)
        }
      })
    ]);

    console.log('Created attendance records:', attendances.length);

    // Create credentials
    const credentials = await Promise.all([
      // Certificate for Charlie from TechCorp
      prisma.credential.create({
        data: {
          userId: users[2].id,
          organizationId: organizations[0].id,
          type: 'CERTIFICATE',
          data: {
            name: 'Blockchain Development Certificate',
            description: 'Completed 100 hours of blockchain development',
            issueDate: new Date().toISOString(),
            skills: ['Solidity', 'Ethereum', 'Smart Contracts']
          },
          issuedAt: dayBeforeYesterday,
          expiresAt: new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()) // Expires in 2 years
        }
      }),
      // Badge for Edward from EduLearn
      prisma.credential.create({
        data: {
          userId: users[4].id,
          organizationId: organizations[1].id,
          type: 'BADGE',
          data: {
            name: 'Perfect Attendance',
            description: 'Maintained 100% attendance for 3 months',
            issueDate: new Date().toISOString()
          },
          issuedAt: yesterday
        }
      }),
      // Access pass for Diana at FinTrust
      prisma.credential.create({
        data: {
          userId: users[3].id,
          organizationId: organizations[2].id,
          type: 'ACCESS_PASS',
          data: {
            name: 'Building Access',
            level: 'Admin',
            areas: ['Main Office', 'Conference Rooms', 'Executive Floor']
          },
          issuedAt: new Date(now.getFullYear(), now.getMonth() - 1, 1)
        }
      })
    ]);

    console.log('Created credentials:', credentials.length);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });