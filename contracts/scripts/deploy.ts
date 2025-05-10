import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n================ Deploying D-Attend Contracts ================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying from address:", deployer.address);

  // Define the owner address (if needed by any contract constructor)
  const ownerAddress = deployer.address; // You can change this if a different address should be passed

  // Deploy Registry first
  const RegistryFactory = await ethers.getContractFactory("DAttendRegistry");
  const registry = await RegistryFactory.deploy(ownerAddress); // Pass the correct argument if needed
  await registry.deployed();
  console.log(`✅ DAttendRegistry deployed at: ${registry.address}`);

  // Deploy AttendanceRecord
  const AttendanceFactory = await ethers.getContractFactory("AttendanceRecord");
  const attendance = await AttendanceFactory.deploy(registry.address); // Pass registry.address
  await attendance.deployed();
  console.log(`✅ AttendanceRecord deployed at: ${attendance.address}`);

  // Deploy CredentialNFT (no arguments required)
  const CredentialFactory = await ethers.getContractFactory("CredentialNFT");
  const credential = await CredentialFactory.deploy(); // No arguments for CredentialNFT constructor
  await credential.deployed();
  console.log(`✅ CredentialNFT deployed at: ${credential.address}`);

  // Deploy IdentityManager (needs registry address)
  const IdentityFactory = await ethers.getContractFactory("IdentityManager");
  const identity = await IdentityFactory.deploy(credential.address); // Pass credential.address here
  await identity.deployed();
  console.log(`✅ IdentityManager deployed at: ${identity.address}`);

  // Get network details
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    chainId: network.chainId,
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    registry: registry.address,
    attendance: attendance.address,
    credential: credential.address,
    identity: identity.address,
  };

  // Save deployment info to a JSON file
  const outputDir = "./deployments";
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `deployment-${network.chainId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\n📦 Deployment info saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
