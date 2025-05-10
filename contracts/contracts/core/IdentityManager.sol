// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CredentialNFT.sol";

/**
 * @title IdentityManager
 * @dev Handles NFT issuance and revocation
 */
contract IdentityManager is Ownable {
    CredentialNFT public credentialNFT;

    constructor(address _nftAddress) {
        credentialNFT = CredentialNFT(_nftAddress);
    }

    function issueCredential(address user, string memory uri) external onlyOwner {
        credentialNFT.mint(user, uri);
    }

    function revokeCredential(uint256 tokenId) external onlyOwner {
        credentialNFT.revoke(tokenId);
    }

    function hasCredential(address user) external view returns (bool) {
        return credentialNFT.hasNFT(user);
    }
}