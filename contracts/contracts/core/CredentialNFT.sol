// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CredentialNFT
 * @dev NFT contract to represent credentials issued to members
 */
contract CredentialNFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    mapping(address => bool) public hasNFT;

    constructor() ERC721("CredentialNFT", "CNFT") {
        tokenCounter = 1;
    }

    function mint(address recipient, string memory tokenURI) external onlyOwner returns (uint256) {
        require(!hasNFT[recipient], "Recipient already has a credential NFT");

        uint256 tokenId = tokenCounter;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
        hasNFT[recipient] = true;
        tokenCounter++;

        return tokenId;
    }

    function revoke(uint256 tokenId) external onlyOwner {
        address owner = ownerOf(tokenId);
        _burn(tokenId);
        hasNFT[owner] = false;
    }
}