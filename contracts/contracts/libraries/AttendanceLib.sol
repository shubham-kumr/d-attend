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