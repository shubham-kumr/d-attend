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
