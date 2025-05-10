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