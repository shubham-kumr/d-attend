// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./../interfaces/IAttendance.sol";
import "./../interfaces/IRegistry.sol";

contract AttendanceRecord is AccessControl, IAttendance {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SERVER_ROLE = keccak256("SERVER_ROLE");

    IRegistry public registry;

    struct Session {
        bytes32 sessionId;
        bytes32 serverId;
        string name;
        uint256 startTime;
        uint256 endTime;
        bytes32 verificationCode;
    }

    struct AttendanceEntry {
        bytes32 sessionId;
        address attendee;
        uint256 checkInTime;
        uint256 duration;
        AttendanceStatus status;
    }

    mapping(bytes32 => Session) public sessions;
    mapping(bytes32 => mapping(address => AttendanceEntry)) private attendanceRecords;
    mapping(bytes32 => address[]) private sessionAttendees;

    constructor(address _registry) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        registry = IRegistry(_registry);
    }

    function createSession(
        bytes32 _serverId,
        string memory _name,
        uint256 _startTime,
        uint256 _endTime,
        bytes32 _verificationCode
    ) external override onlyRole(SERVER_ROLE) {
        require(_endTime > _startTime, "Invalid time range");

        ( , , , , address serverAddress, , ) = registry.getServer(_serverId);
        require(serverAddress == msg.sender, "Unauthorized server");

        bytes32 sessionId = keccak256(abi.encodePacked(_serverId, _startTime, _endTime, block.timestamp));

        sessions[sessionId] = Session({
            sessionId: sessionId,
            serverId: _serverId,
            name: _name,
            startTime: _startTime,
            endTime: _endTime,
            verificationCode: _verificationCode,
            active: true,
            creator: msg.sender
        });
    }

    function updateSession(bytes32 _sessionId, bool _active) external override onlyRole(SERVER_ROLE) {
        require(sessions[_sessionId].creator == msg.sender, "Unauthorized");
        sessions[_sessionId].active = _active;
    }

    function recordAttendance(
        bytes32 _sessionId,
        address _attendee,
        bytes32 _verificationCode
    ) external override {
        Session memory session = sessions[_sessionId];
        require(session.active, "Session inactive");
        require(session.verificationCode == _verificationCode, "Invalid code");

        AttendanceEntry storage entry = attendanceRecords[_sessionId][_attendee];
        require(entry.checkInTime == 0, "Already checked in");

        uint256 nowTime = block.timestamp;
        require(nowTime >= session.startTime && nowTime <= session.endTime, "Outside session time");

        uint256 duration = session.endTime - nowTime;

        attendanceRecords[_sessionId][_attendee] = AttendanceEntry({
            sessionId: _sessionId,
            attendee: _attendee,
            checkInTime: nowTime,
            duration: duration,
            status: AttendanceStatus.PRESENT
        });

        sessionAttendees[_sessionId].push(_attendee);
    }

    function updateAttendanceStatus(
        bytes32 _sessionId,
        address _attendee,
        AttendanceStatus _status
    ) external override onlyRole(SERVER_ROLE) {
        require(sessions[_sessionId].active, "Invalid session");
        attendanceRecords[_sessionId][_attendee].status = _status;
    }

    function getSessionAttendees(bytes32 _sessionId) external view override returns (address[] memory) {
        return sessionAttendees[_sessionId];
    }

    function getAttendanceDetails(bytes32 _sessionId, address _attendee)
        external
        view
        override
        returns (
            bytes32 sessionId,
            address attendee,
            uint256 checkInTime,
            uint256 duration,
            AttendanceStatus status
        )
    {
        AttendanceEntry memory entry = attendanceRecords[_sessionId][_attendee];
        return (
            entry.sessionId,
            entry.attendee,
            entry.checkInTime,
            entry.duration,
            entry.status
        );
    }
}
