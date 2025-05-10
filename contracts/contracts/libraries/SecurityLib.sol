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
    return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _salt)));
    }
}
