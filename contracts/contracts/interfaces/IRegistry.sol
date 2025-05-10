// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IRegistry {
    function getServer(bytes32 _serverId)
        external
        view
        returns (
            bytes32 serverId,
            bytes32 orgId,
            string memory name,
            string memory description,
            address serverAddress,
            uint256 createdAt,
            bool active
        );
}
