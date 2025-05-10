// contracts/core/DAttendRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IAttendance.sol";

/**
 * @title DAttendRegistry
 * @dev Main registry for organizations and servers
 */
contract DAttendRegistry is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // Structs
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

    // Mappings
    mapping(bytes32 => Organization) public organizations;
    mapping(bytes32 => Server) public servers;
    mapping(address => bytes32) public userToOrgId;
    mapping(bytes32 => EnumerableSet.AddressSet) private orgMembers;
    mapping(bytes32 => EnumerableSet.Bytes32Set) private orgServers;

    // Events
    event OrganizationCreated(bytes32 indexed orgId, string name, address admin);
    event OrganizationUpdated(bytes32 indexed orgId, string name, bool active);
    event ServerCreated(bytes32 indexed serverId, bytes32 indexed orgId, string name);
    event ServerUpdated(bytes32 indexed serverId, string name, bool active);
    event MemberAdded(bytes32 indexed orgId, address member);
    event MemberRemoved(bytes32 indexed orgId, address member);

    // Modifiers
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

    /**
     * @dev Create a new organization
     * @param _name Organization name
     */
    function createOrganization(string memory _name) external {
        bytes32 orgId = keccak256(abi.encodePacked(_name, msg.sender, block.timestamp));
        
        require(userToOrgId[msg.sender] == bytes32(0), "User already has an organization");
        
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

    /**
     * @dev Update organization details
     * @param _orgId Organization ID
     * @param _name New organization name
     * @param _active Organization status
     */
    function updateOrganization(
        bytes32 _orgId,
        string memory _name,
        bool _active
    ) external onlyOrgAdmin(_orgId) orgExists(_orgId) {
        Organization storage org = organizations[_orgId];
        org.name = _name;
        org.active = _active;
        
        emit OrganizationUpdated(_orgId, _name, _active);
    }

    /**
     * @dev Create a new server within an organization
     * @param _orgId Organization ID
     * @param _name Server name
     * @param _description Server description
     */
    function createServer(
        bytes32 _orgId,
        string memory _name,
        string memory _description
    ) external onlyOrgAdmin(_orgId) orgExists(_orgId) {
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

    /**
     * @dev Update server details
     * @param _serverId Server ID
     * @param _name New server name
     * @param _description New server description
     * @param _active Server status
     */
    function updateServer(
        bytes32 _serverId,
        string memory _name,
        string memory _description,
        bool _active
    ) external onlyServerOwner(_serverId) serverExists(_serverId) {
        Server storage server = servers[_serverId];
        server.name = _name;
        server.description = _description;
        server.active = _active;
        
        emit ServerUpdated(_serverId, _name, _active);
    }

    /**
     * @dev Add a member to an organization
     * @param _orgId Organization ID
     * @param _member Member address to add
     */
    function addMember(bytes32 _orgId, address _member) external onlyOrgAdmin(_orgId) orgExists(_orgId) {
        require(_member != address(0), "Invalid address");
        require(!orgMembers[_orgId].contains(_member), "Already a member");
        
        orgMembers[_orgId].add(_member);
        
        emit MemberAdded(_orgId, _member);
    }

    /**
     * @dev Remove a member from an organization
     * @param _orgId Organization ID
     * @param _member Member address to remove
     */
    function removeMember(bytes32 _orgId, address _member) external onlyOrgAdmin(_orgId) orgExists(_orgId) {
        require(orgMembers[_orgId].contains(_member), "Not a member");
        require(_member != organizations[_orgId].admin, "Cannot remove admin");
        
        orgMembers[_orgId].remove(_member);
        
        emit MemberRemoved(_orgId, _member);
    }

    /**
     * @dev Check if an address is a member of an organization
     * @param _orgId Organization ID
     * @param _member Address to check
     * @return bool True if address is a member
     */
    function isMember(bytes32 _orgId, address _member) external view returns (bool) {
        return orgMembers[_orgId].contains(_member);
    }

    /**
     * @dev Get all servers in an organization
     * @param _orgId Organization ID
     * @return bytes32[] Array of server IDs
     */
    function getOrgServers(bytes32 _orgId) external view orgExists(_orgId) returns (bytes32[] memory) {
        uint256 length = orgServers[_orgId].length();
        bytes32[] memory result = new bytes32[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = orgServers[_orgId].at(i);
        }
        
        return result;
    }

    /**
     * @dev Get all members in an organization
     * @param _orgId Organization ID
     * @return address[] Array of member addresses
     */
    function getOrgMembers(bytes32 _orgId) external view orgExists(_orgId) returns (address[] memory) {
        uint256 length = orgMembers[_orgId].length();
        address[] memory result = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = orgMembers[_orgId].at(i);
        }
        
        return result;
    }
}

// contracts/core/AttendanceRecord.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAttendance.sol";
import "./DAttendRegistry.sol";

/**
 * @title AttendanceRecord
 * @dev Manages attendance records for servers
 */
contract AttendanceRecord is AccessControl, IAttendance {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    
    DAttendRegistry public registry;
    
    // Structs
    struct Session {
        bytes32 id;
        bytes32 serverId;
        string name;
        uint256 startTime;
        uint256 endTime;
        bytes32 verificationCode;
        bool active;
    }
    
    struct Attendance {
        bytes32 sessionId;
        address attendee;
        uint256 checkInTime;
        uint256 duration;
        AttendanceStatus status;
    }
    
    // Mappings
    mapping(bytes32 => Session) public sessions;
    mapping(bytes32 => mapping(address => Attendance)) public attendances;
    mapping(bytes32 => address[]) public sessionAttendees;
    
    // Events
    event SessionCreated(bytes32 indexed sessionId, bytes32 indexed serverId, string name);
    event SessionUpdated(bytes32 indexed sessionId, bool active);
    event AttendanceRecorded(bytes32 indexed sessionId, address indexed attendee, AttendanceStatus status);
    
    constructor(address _registryAddress) {
        registry = DAttendRegistry(_registryAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // Modifiers
    modifier onlyServerOwner(bytes32 _serverId) {
        bytes32 orgId = registry.servers(_serverId).orgId;
        require(registry.organizations(orgId).admin == msg.sender, "Not server owner");
        _;
    }
    
    modifier sessionExists(bytes32 _sessionId) {
        require(sessions[_sessionId].startTime > 0, "Session not found");
        _;
    }
    
    modifier onlyActive(bytes32 _sessionId) {
        require(sessions[_sessionId].active, "Session not active");
        _;
    }
    
    /**
     * @dev Create a new attendance session
     * @param _serverId Server ID
     * @param _name Session name
     * @param _startTime Session start time
     * @param _endTime Session end time
     * @param _verificationCode Verification code for check-ins
     */
    function createSession(
        bytes32 _serverId,
        string memory _name,
        uint256 _startTime,
        uint256 _endTime,
        bytes32 _verificationCode
    ) external onlyServerOwner(_serverId) {
        require(_startTime < _endTime, "Invalid time range");
        
        bytes32 sessionId = keccak256(abi.encodePacked(_serverId, _name, _startTime));
        
        sessions[sessionId] = Session({
            id: sessionId,
            serverId: _serverId,
            name: _name,
            startTime: _startTime,
            endTime: _endTime,
            verificationCode: _verificationCode,
            active: true
        });
        
        emit SessionCreated(sessionId, _serverId, _name);
    }
    
    /**
     * @dev Update session status
     * @param _sessionId Session ID
     * @param _active Session active status
     */
    function updateSession(bytes32 _sessionId, bool _active) 
        external 
        sessionExists(_sessionId) 
    {
        bytes32 serverId = sessions[_sessionId].serverId;
        require(
            msg.sender == registry.servers(serverId).owner || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        sessions[_sessionId].active = _active;
        
        emit SessionUpdated(_sessionId, _active);
    }
    
    /**
     * @dev Record attendance for a user
     * @param _sessionId Session ID
     * @param _attendee Address of attendee
     * @param _verificationCode Verification code
     */
    function recordAttendance(
        bytes32 _sessionId,
        address _attendee,
        bytes32 _verificationCode
    ) 
        external 
        sessionExists(_sessionId)
        onlyActive(_sessionId)
    {
        Session memory session = sessions[_sessionId];
        
        // Verify session is ongoing
        require(block.timestamp >= session.startTime, "Session not started");
        require(block.timestamp <= session.endTime, "Session ended");
        
        // Verify the verification code
        require(_verificationCode == session.verificationCode, "Invalid verification code");
        
        // Verify attendee is a member of the organization
        bytes32 orgId = registry.servers(session.serverId).orgId;
        require(registry.isMember(orgId, _attendee), "Not a member");
        
        // Record attendance if not already recorded
        if (attendances[_sessionId][_attendee].checkInTime == 0) {
            attendances[_sessionId][_attendee] = Attendance({
                sessionId: _sessionId,
                attendee: _attendee,
                checkInTime: block.timestamp,
                duration: 0,
                status: AttendanceStatus.PRESENT
            });
            
            sessionAttendees[_sessionId].push(_attendee);
            
            emit AttendanceRecorded(_sessionId, _attendee, AttendanceStatus.PRESENT);
        }
    }
    
    /**
     * @dev Update attendance status by verifier
     * @param _sessionId Session ID
     * @param _attendee Address of attendee
     * @param _status New attendance status
     */
    function updateAttendanceStatus(
        bytes32 _sessionId,
        address _attendee,
        AttendanceStatus _status
    ) 
        external 
        sessionExists(_sessionId)
        onlyRole(VERIFIER_ROLE)
    {
        require(attendances[_sessionId][_attendee].checkInTime > 0, "No attendance record");
        
        attendances[_sessionId][_attendee].status = _status;
        
        if (_status == AttendanceStatus.PRESENT) {
            // Calculate duration if status is PRESENT and session has ended
            Session memory session = sessions[_sessionId];
            if (block.timestamp > session.endTime) {
                attendances[_sessionId][_attendee].duration = 
                    session.endTime - attendances[_sessionId][_attendee].checkInTime;
            }
        }
        
        emit AttendanceRecorded(_sessionId, _attendee, _status);
    }
    
    /**
     * @dev Get all attendees for a session
     * @param _sessionId Session ID
     * @return address[] Array of attendee addresses
     */
    function getSessionAttendees(bytes32 _sessionId) 
        external 
        view 
        sessionExists(_sessionId) 
        returns (address[] memory)
    {
        return sessionAttendees[_sessionId];
    }
    
    /**
     * @dev Get attendance details for an attendee in a session
     * @param _sessionId Session ID
     * @param _attendee Address of attendee
     * @return Attendance Attendance record
     */
    function getAttendanceDetails(bytes32 _sessionId, address _attendee)
        external
        view
        sessionExists(_sessionId)
        returns (Attendance memory)
    {
        return attendances[_sessionId][_attendee];
    }
    
    /**
     * @dev Add a verifier
     * @param _verifier Address to add as verifier
     */
    function addVerifier(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VERIFIER_ROLE, _verifier);
    }
    
    /**
     * @dev Remove a verifier
     * @param _verifier Address to remove as verifier
     */
    function removeVerifier(address _verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VERIFIER_ROLE, _verifier);
    }
}

// contracts/core/CredentialNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./DAttendRegistry.sol";

/**
 * @title CredentialNFT
 * @dev NFT-based attendance credentials
 */
contract CredentialNFT is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;
    
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    Counters.Counter private _tokenIds;
    DAttendRegistry public registry;
    
    // Structs
    struct Credential {
        uint256 tokenId;
        bytes32 orgId;
        bytes32 serverId;
        address recipient;
        string metadata;
        uint256 issuedAt;
        bool revoked;
    }
    
    // Mappings
    mapping(uint256 => Credential) public credentials;
    mapping(address => uint256[]) public userCredentials;
    
    // Events
    event CredentialIssued(uint256 indexed tokenId, address indexed recipient, bytes32 indexed orgId);
    event CredentialRevoked(uint256 indexed tokenId);
    
    constructor(address _registryAddress) ERC721("D-Attend Credential", "DCRED") {
        registry = DAttendRegistry(_registryAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ISSUER_ROLE, msg.sender);
    }
    
    // Modifiers
    modifier onlyOrgAdmin(bytes32 _orgId) {
        require(registry.organizations(_orgId).admin == msg.sender, "Not org admin");
        _;
    }
    
    /**
     * @dev Issue a new credential
     * @param _recipient Recipient address
     * @param _orgId Organization ID
     * @param _serverId Server ID
     * @param _tokenURI Token URI for metadata
     * @return uint256 New token ID
     */
    function issueCredential(
        address _recipient,
        bytes32 _orgId,
        bytes32 _serverId,
        string memory _tokenURI
    ) 
        external 
        onlyRole(ISSUER_ROLE) 
        returns (uint256)
    {
        require(_recipient != address(0), "Invalid recipient");
        require(registry.isMember(_orgId, _recipient), "Not a member");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(_recipient, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        credentials[newTokenId] = Credential({
            tokenId: newTokenId,
            orgId: _orgId,
            serverId: _serverId,
            recipient: _recipient,
            metadata: _tokenURI,
            issuedAt: block.timestamp,
            revoked: false
        });
        
        userCredentials[_recipient].push(newTokenId);
        
        emit CredentialIssued(newTokenId, _recipient, _orgId);
        
        return newTokenId;
    }
    
    /**
     * @dev Revoke a credential
     * @param _tokenId Token ID to revoke
     */
    function revokeCredential(uint256 _tokenId) external {
        Credential memory cred = credentials[_tokenId];
        
        require(
            registry.organizations(cred.orgId).admin == msg.sender || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        credentials[_tokenId].revoked = true;
        
        emit CredentialRevoked(_tokenId);
    }
    
    /**
     * @dev Get all credential IDs for a user
     * @param _user User address
     * @return uint256[] Array of token IDs
     */
    function getUserCredentials(address _user) external view returns (uint256[] memory) {
        return userCredentials[_user];
    }
    
    /**
     * @dev Add an issuer
     * @param _issuer Address to add as issuer
     */
    function addIssuer(address _issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, _issuer);
    }
    
    /**
     * @dev Remove an issuer
     * @param _issuer Address to remove as issuer
     */
    function removeIssuer(address _issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, _issuer);
    }
    
    /**
     * @dev Check if a credential is valid
     * @param _tokenId Token ID to check
     * @return bool True if credential is valid
     */
    function isValidCredential(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId) && !credentials[_tokenId].revoked;
    }
    
    // Override required function
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// contracts/core/IdentityManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./DAttendRegistry.sol";

/**
 * @title IdentityManager
 * @dev Manages user identities and roles
 */
contract IdentityManager is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    DAttendRegistry public registry;
    
    // Structs
    struct Identity {
        address user;
        string displayName;
        string metadata;
        uint256 createdAt;
        bool verified;
    }
    
    // Mappings
    mapping(address => Identity) public identities;
    mapping(bytes32 => mapping(address => bytes32)) public orgMemberRoles; // orgId => user => roleId
    
    // Events
    event IdentityCreated(address indexed user, string displayName);
    event IdentityUpdated(address indexed user, string displayName, bool verified);
    event RoleAssigned(bytes32 indexed orgId, address indexed user, bytes32 roleId);
    
    constructor(address _registryAddress) {
        registry = DAttendRegistry(_registryAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
    }
    
    // Modifiers
    modifier onlyOrgAdmin(bytes32 _orgId) {
        require(registry.organizations(_orgId).admin == msg.sender, "Not org admin");
        _;
    }
    
    /**
     * @dev Create or update a user identity
     * @param _displayName User display name
     * @param _metadata Additional metadata (JSON string)
     */
    function setIdentity(string memory _displayName, string memory _metadata) external {
        if (identities[msg.sender].createdAt == 0) {
            // New identity
            identities[msg.sender] = Identity({
                user: msg.sender,
                displayName: _displayName,
                metadata: _metadata,
                createdAt: block.timestamp,
                verified: false
            });
            
            emit IdentityCreated(msg.sender, _displayName);
        } else {
            // Update existing identity
            Identity storage identity = identities[msg.sender];
            identity.displayName = _displayName;
            identity.metadata = _metadata;
            
            emit IdentityUpdated(msg.sender, _displayName, identity.verified);
        }
    }
    
    /**
     * @dev Set verification status for a user identity
     * @param _user User address
     * @param _verified Verification status
     */
    function setVerificationStatus(address _user, bool _verified) external onlyRole(MANAGER_ROLE) {
        require(identities[_user].createdAt > 0, "Identity not found");
        
        identities[_user].verified = _verified;
        
        emit IdentityUpdated(_user, identities[_user].displayName, _verified);
    }
    
    /**
     * @dev Assign a role to a user within an organization
     * @param _orgId Organization ID
     * @param _user User address
     * @param _roleId Role ID
     */
    function assignRole(bytes32 _orgId, address _user, bytes32 _roleId) 
        external 
        onlyOrgAdmin(_orgId) 
    {
        require(registry.isMember(_orgId, _user), "Not a member");
        
        orgMemberRoles[_orgId][_user] = _roleId;
        
        emit RoleAssigned(_orgId, _user, _roleId);
    }
    
    /**
     * @dev Get user role in an organization
     * @param _orgId Organization ID
     * @param _user User address
     * @return bytes32 Role ID
     */
    function getUserRole(bytes32 _orgId, address _user) external view returns (bytes32) {
        return orgMemberRoles[_orgId][_user];
    }
    
    /**
     * @dev Add a manager
     * @param _manager Address to add as manager
     */
    function addManager(address _manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
    }
    
    /**
     * @dev Remove a manager
     * @param _manager Address to remove as manager
     */
    function removeManager(address _manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MANAGER_ROLE, _manager);
    }
}

// contracts/interfaces/IAttendance.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAttendance
 * @dev Interface for attendance management
 */
interface IAttendance {
    enum AttendanceStatus { ABSENT, PRESENT, LATE, EXCUSED }
    
    function createSession(
        bytes32 _serverId,
        string memory _name,
        uint256 _startTime,
        uint256 _endTime,
        bytes32 _verificationCode
    ) external;
    
    function updateSession(bytes32 _sessionId, bool _active) external;
    
    function recordAttendance(
        bytes32 _sessionId,
        address _attendee,
        bytes32 _verificationCode
    ) external;
    
    function updateAttendanceStatus(
        bytes32 _sessionId,
        address _attendee,
        AttendanceStatus _status
    ) external;
    
    function getSessionAttendees(bytes32 _sessionId) external view returns (address[] memory);
    
    function getAttendanceDetails(bytes32 _sessionId, address _attendee)
        external
        view
        returns (
            bytes32 sessionId,
            address attendee,
            uint256 checkInTime,
            uint256 duration,
            AttendanceStatus status
        );
}

// contracts/interfaces/ICredential.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICredential
 * @dev Interface for credential management
 */
interface ICredential {
    function issueCredential(
        address _recipient,
        bytes32 _orgId,
        bytes32 _serverId,
        string memory _tokenURI
    ) external returns (uint256);
    
    function revokeCredential(uint256 _tokenId) external;
    
    function getUserCredentials(address _user) external view returns (uint256[] memory);
    
    function isValidCredential(uint256 _tokenId) external view returns (bool);
}

// contracts/libraries/AttendanceLib.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AttendanceLib
 * @dev Library for attendance-related operations
 */
library AttendanceLib {
    /**
     * @dev Generate a verification code for a session
     * @param _sessionId Session ID
     * @param _salt Random salt value
     * @return bytes32 Verification code
     */
    function generateVerificationCode(bytes32 _sessionId, bytes32 _salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_sessionId, _salt));
    }
    
    /**
     * @dev Validate time ranges
     * @param _startTime Session start time
     * @param _endTime Session end time
     * @return bool Validity status
     */
    function validateTimeRange(uint256 _startTime, uint256 _endTime) internal view returns (bool) {
        // Start time must be in the future
        if (_startTime < block.timestamp) {
            return false;
        }
        
        // End time must be after start time
        if (_endTime <= _startTime) {
            return false;
        }
        
        // Session duration shouldn't be too long (e.g., 24 hours max)
        if (_endTime - _startTime > 86400) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Calculate attendance duration
     * @param _checkInTime Check-in timestamp
     * @param _sessionEndTime Session end timestamp
     * @return uint256 Duration in seconds
     */
    function calculateDuration(uint256 _checkInTime, uint256 _sessionEndTime) internal view returns (uint256) {
        // If session has ended, use session end time
        if (block.timestamp >= _sessionEndTime) {
            return _sessionEndTime - _checkInTime;
        }
        
        // Otherwise, use current time
        return block.timestamp - _checkInTime;
    }
}

// contracts/libraries/CredentialLib.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CredentialLib
 * @dev Library for credential-related operations
 */
library CredentialLib {
    /**
     * @dev Generate token URI metadata format
     * @param _name Credential name
     * @param _description Credential description
     * @param _imageUrl Image URL
     * @param _attributes Additional attributes as JSON string
     * @return string Formatted metadata JSON string
     */
    function formatMetadata(
        string memory _name,
        string memory _description,
        string memory _imageUrl,
        string memory _attributes
    ) internal pure returns (string memory) {
        // This is a simplified version - in production, use a library like
        // OpenZeppelin's Strings or a proper JSON builder
        return string(
            abi.encodePacked(
                '{"name":"', _name,
                '","description":"', _description,
                '","image":"', _imageUrl,
                '","attributes":', _attributes, '}'
            )
        );
    }
    
    /**
     * @dev Verify if a credential meets basic validity requirements
     * @param _recipient Recipient address
     * @param _metadata Metadata string
     * @return bool Validity status
     */
    function validateCredential(address _recipient, string memory _metadata) internal pure returns (bool) {
        // Check recipient is not zero address
        if (_recipient == address(0)) {
            return false;
        }
        
        // Check metadata is not empty
        bytes memory metadataBytes = bytes(_metadata);
        if (metadataBytes.length == 0) {
            return false;
        }
        
        return true;
    }
}

// contracts/libraries/SecurityLib.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SecurityLib
 * @dev Library for security-related operations
 */
library SecurityLib {
    /**
     * @dev Generate a hash for a message with a unique salt
     * @param _message Message to hash
     * @param _salt Random salt value
     * @return bytes32 Hash value
     */
    function generateHash(string memory _message, bytes32 _salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_message, _salt));
    }
    
    /**
     * @dev Verify a signed message
     * @param _hash Message hash
     * @param _signature Signature bytes
     * @param _signer Expected signer address
     * @return bool Validity status
     */
    function verifySignature(bytes32 _hash, bytes memory _signature, address _signer) internal pure returns (bool) {
        // Split signature into r, s, v components
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        if (_signature.length != 65) {
            return false;
        }
        
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        if (v != 27 && v != 28) {
            return false;
        }
        
        // Recover signer address
        address recovered = ecrecover(_hash, v, r, s);
        
        return (recovered == _signer);
    }
    
    /**
     * @dev Generate a random number using block data and a salt
     * @param _salt Additional entropy source
     * @return uint256 Pseudo-random number
     */
    function random(bytes32 _salt) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, _salt)));
    }
}

// contracts/hardhat.config.ts
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    polygon_mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
    },
    polygon: {
      url: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 137,
    },
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

// contracts/scripts/deploy.ts
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying D-Attend contracts...");

  // Deploy Registry first
  const DAttendRegistry = await ethers.getContractFactory("DAttendRegistry");
  const registry = await DAttendRegistry.deploy();
  await registry.deployed();
  
  console.log(`DAttendRegistry deployed to: ${registry.address}`);

  // Deploy AttendanceRecord
  const AttendanceRecord = await ethers.getContractFactory("AttendanceRecord");
  const attendance = await AttendanceRecord.deploy(registry.address);
  await attendance.deployed();
  
  console.log(`AttendanceRecord deployed to: ${attendance.address}`);

  // Deploy CredentialNFT
  const CredentialNFT = await ethers.getContractFactory("CredentialNFT");
  const credential = await CredentialNFT.deploy(registry.address);
  await credential.deployed();
  
  console.log(`CredentialNFT deployed to: ${credential.address}`);

  // Deploy IdentityManager
  const IdentityManager = await ethers.getContractFactory("IdentityManager");
  const identity = await IdentityManager.deploy(registry.address);
  await identity.deployed();
  
  console.log(`IdentityManager deployed to: ${identity.address}`);

  // Save deployment addresses
  const deploymentInfo = {
    registry: registry.address,
    attendance: attendance.address,
    credential: credential.address,
    identity: identity.address,
    chainId: (await ethers.provider.getNetwork()).chainId,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment addresses saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// contracts/test/registry.test.ts
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