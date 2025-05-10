import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("DAttendRegistry", function () {
  let registry: Contract;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let member: SignerWithAddress;

  beforeEach(async function () {
    [owner, admin, member] = await ethers.getSigners();
    
    const DAttendRegistry = await ethers.getContractFactory("DAttendRegistry");
    registry = await DAttendRegistry.deploy();
    await registry.deployed();
  });

  describe("Organization Management", function () {
    it("Should create an organization", async function () {
      const orgName = "Test Organization";
      
      await expect(registry.connect(admin).createOrganization(orgName))
        .to.emit(registry, "OrganizationCreated");
      
      // Get the created organization ID
      const orgId = await registry.userToOrgId(admin.address);
      
      // Fetch organization details
      const org = await registry.organizations(orgId);
      
      expect(org.name).to.equal(orgName);
      expect(org.admin).to.equal(admin.address);
      expect(org.active).to.be.true;
    });

    it("Should update organization details", async function () {
      // Create org first
      await registry.connect(admin).createOrganization("Original Name");
      const orgId = await registry.userToOrgId(admin.address);
      
      // Update the organization
      const newName = "Updated Organization";
      await expect(registry.connect(admin).updateOrganization(orgId, newName, true))
        .to.emit(registry, "OrganizationUpdated")
        .withArgs(orgId, newName, true);
      
      // Verify updated details
      const org = await registry.organizations(orgId);
      expect(org.name).to.equal(newName);
    });
  });

  describe("Server Management", function () {
    let orgId: string;
    
    beforeEach(async function () {
      // Setup organization first
      await registry.connect(admin).createOrganization("Test Org");
      orgId = await registry.userToOrgId(admin.address);
    });
    
    it("Should create a server", async function () {
      const serverName = "Test Server";
      const serverDesc = "Test Description";
      
      await expect(registry.connect(admin).createServer(orgId, serverName, serverDesc))
        .to.emit(registry, "ServerCreated");
      
      // Get the servers for the org
      const servers = await registry.getOrgServers(orgId);
      expect(servers.length).to.equal(1);
      
      // Fetch server details
      const server = await registry.servers(servers[0]);
      expect(server.name).to.equal(serverName);
      expect(server.description).to.equal(serverDesc);
      expect(server.owner).to.equal(admin.address);
    });
  });

  describe("Member Management", function () {
    let orgId: string;
    
    beforeEach(async function () {
      // Setup organization first
      await registry.connect(admin).createOrganization("Test Org");
      orgId = await registry.userToOrgId(admin.address);
    });
    
    it("Should add a member", async function () {
      await expect(registry.connect(admin).addMember(orgId, member.address))
        .to.emit(registry, "MemberAdded")
        .withArgs(orgId, member.address);
      
      // Verify membership
      expect(await registry.isMember(orgId, member.address)).to.be.true;
      
      // Get members list
      const members = await registry.getOrgMembers(orgId);
      expect(members).to.include(member.address);
    });
    
    it("Should remove a member", async function () {
      // Add member first
      await registry.connect(admin).addMember(orgId, member.address);
      
      // Remove member
      await expect(registry.connect(admin).removeMember(orgId, member.address))
        .to.emit(registry, "MemberRemoved")
        .withArgs(orgId, member.address);
      
      // Verify membership removed
      expect(await registry.isMember(orgId, member.address)).to.be.false;
    });
  });
});