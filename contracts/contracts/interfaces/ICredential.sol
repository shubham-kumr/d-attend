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