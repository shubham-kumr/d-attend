import { run, ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function verifyContract(address: string, constructorArgs: any[] = []) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ Verified: ${address}`);
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log(`🔁 Already Verified: ${address}`);
    } else {
      console.error(`❌ Verification failed for ${address}:`, error.message);
    }
  }
}

async function main() {
  console.log("\n================ Verifying Contracts ================\n");

  const network = await ethers.provider.getNetwork();
  const filePath = path.join(__dirname, `../deployments/deployment-${network.chainId}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Deployment file not found for network ${network.chainId}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // Contracts that use registry as constructor argument
  const constructorArgs = [deployment.registry];

  await verifyContract(deployment.registry); // No constructor args
  await verifyContract(deployment.attendance, constructorArgs);
  await verifyContract(deployment.credential, constructorArgs);
  await verifyContract(deployment.identity, constructorArgs);

  console.log("\n🎉 All contracts verified.\n");
}

main().catch((error) => {
  console.error("❌ Verification script failed:", error);
  process.exit(1);
});
