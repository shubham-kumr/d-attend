// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./IdentityManager.sol";

/**
 * @title DAttendRegistry
 * @dev Registry for organizations and their servers
 */
contract DAttendRegistry is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    IdentityManager public identityManager;

    struct Organization {
        bytes32 id;
        string name;
        address admin;
        uint256 createdAt;
        bool active;
    }

    struct Server {
        bytes32 id;
        bytes32 orgId;
        string name;
        string description;
        address owner;
        uint256 createdAt;
        bool active;
    }

    mapping(bytes32 => Organization) public organizations;
    mapping(bytes32 => Server) public servers;
    mapping(address => bytes32) public userToOrgId;
    mapping(bytes32 => EnumerableSet.AddressSet) private orgMembers;
    mapping(bytes32 => EnumerableSet.Bytes32Set) private orgServers;

    event OrganizationCreated(bytes32 indexed orgId, string name, address admin);
    event OrganizationUpdated(bytes32 indexed orgId, string name, bool active);
    event ServerCreated(bytes32 indexed serverId, bytes32 indexed orgId, string name);
    event ServerUpdated(bytes32 indexed serverId, string name, bool active);
    event MemberAdded(bytes32 indexed orgId, address member);
    event MemberRemoved(bytes32 indexed orgId, address member);

    modifier onlyOrgAdmin(bytes32 _orgId) {
        require(organizations[_orgId].admin == msg.sender, "Not org admin");
        _;
    }

    modifier onlyServerOwner(bytes32 _serverId) {
        require(servers[_serverId].owner == msg.sender, "Not server owner");
        _;
    }

    modifier orgExists(bytes32 _orgId) {
        require(organizations[_orgId].createdAt > 0, "Organization not found");
        _;
    }

    modifier serverExists(bytes32 _serverId) {
        require(servers[_serverId].createdAt > 0, "Server not found");
        _;
    }

    constructor(address _identityManager) {
        identityManager = IdentityManager(_identityManager);
    }

    function createOrganization(string memory _name) external {
        require(userToOrgId[msg.sender] == bytes32(0), "User already has an organization");

        bytes32 orgId = keccak256(abi.encodePacked(_name, msg.sender, block.timestamp));

        organizations[orgId] = Organization({
            id: orgId,
            name: _name,
            admin: msg.sender,
            createdAt: block.timestamp,
            active: true
        });

        userToOrgId[msg.sender] = orgId;
        orgMembers[orgId].add(msg.sender);

        emit OrganizationCreated(orgId, _name, msg.sender);
    }

    function updateOrganization(bytes32 _orgId, string memory _name, bool _active)
        external onlyOrgAdmin(_orgId) orgExists(_orgId)
    {
        Organization storage org = organizations[_orgId];
        org.name = _name;
        org.active = _active;

        emit OrganizationUpdated(_orgId, _name, _active);
    }

    function createServer(bytes32 _orgId, string memory _name, string memory _description)
        external onlyOrgAdmin(_orgId) orgExists(_orgId)
    {
        bytes32 serverId = keccak256(abi.encodePacked(_name, _orgId, block.timestamp));

        servers[serverId] = Server({
            id: serverId,
            orgId: _orgId,
            name: _name,
            description: _description,
            owner: msg.sender,
            createdAt: block.timestamp,
            active: true
        });

        orgServers[_orgId].add(serverId);

        emit ServerCreated(serverId, _orgId, _name);
    }

    function updateServer(bytes32 _serverId, string memory _name, string memory _description, bool _active)
        external onlyServerOwner(_serverId) serverExists(_serverId)
    {
        Server storage server = servers[_serverId];
        server.name = _name;
        server.description = _description;
        server.active = _active;

        emit ServerUpdated(_serverId, _name, _active);
    }

    function addMember(bytes32 _orgId, address _member, string memory _tokenURI)
        external onlyOrgAdmin(_orgId) orgExists(_orgId)
    {
        require(_member != address(0), "Invalid address");
        require(!orgMembers[_orgId].contains(_member), "Already a member");

        orgMembers[_orgId].add(_member);
        identityManager.issueCredential(_member, _tokenURI);

        emit MemberAdded(_orgId, _member);
    }

    function removeMember(bytes32 _orgId, address _member, uint256 _tokenId)
        external onlyOrgAdmin(_orgId) orgExists(_orgId)
    {
        require(orgMembers[_orgId].contains(_member), "Not a member");
        require(_member != organizations[_orgId].admin, "Cannot remove admin");

        orgMembers[_orgId].remove(_member);
        identityManager.revokeCredential(_tokenId);

        emit MemberRemoved(_orgId, _member);
    }

    function isMember(bytes32 _orgId, address _member) external view returns (bool) {
        return orgMembers[_orgId].contains(_member);
    }

    function getOrgServers(bytes32 _orgId) external view orgExists(_orgId) returns (bytes32[] memory) {
        uint256 length = orgServers[_orgId].length();
        bytes32[] memory result = new bytes32[](length);

        for (uint256 i = 0; i < length; i++) {
            result[i] = orgServers[_orgId].at(i);
        }

        return result;
    }

    function getOrgMembers(bytes32 _orgId) external view orgExists(_orgId) returns (address[] memory) {
        uint256 length = orgMembers[_orgId].length();
        address[] memory result = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            result[i] = orgMembers[_orgId].at(i);
        }

        return result;
    }
}
