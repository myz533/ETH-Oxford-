// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FriendCircle
 * @notice Manages friend circles (social graphs) on-chain.
 *         Users create circles, invite friends, and circles serve as
 *         the social layer for goal markets.
 */
contract FriendCircle is Ownable {
    struct Circle {
        uint256 id;
        string name;
        address creator;
        address[] members;
        bool isActive;
        uint256 createdAt;
    }

    uint256 public nextCircleId = 1;

    // circleId => Circle
    mapping(uint256 => Circle) public circles;
    // circleId => member => isMember
    mapping(uint256 => mapping(address => bool)) public isMember;
    // user => list of circle IDs they belong to
    mapping(address => uint256[]) public userCircles;
    // circleId => invitee => isPending
    mapping(uint256 => mapping(address => bool)) public pendingInvites;

    event CircleCreated(uint256 indexed circleId, string name, address indexed creator);
    event MemberJoined(uint256 indexed circleId, address indexed member);
    event MemberLeft(uint256 indexed circleId, address indexed member);
    event InviteSent(uint256 indexed circleId, address indexed invitee, address indexed inviter);

    constructor() Ownable(msg.sender) {}

    /// @notice Create a new friend circle
    function createCircle(string calldata name) external returns (uint256) {
        uint256 circleId = nextCircleId++;

        Circle storage circle = circles[circleId];
        circle.id = circleId;
        circle.name = name;
        circle.creator = msg.sender;
        circle.isActive = true;
        circle.createdAt = block.timestamp;
        circle.members.push(msg.sender);

        isMember[circleId][msg.sender] = true;
        userCircles[msg.sender].push(circleId);

        emit CircleCreated(circleId, name, msg.sender);
        emit MemberJoined(circleId, msg.sender);

        return circleId;
    }

    /// @notice Invite a friend to your circle
    function inviteToCircle(uint256 circleId, address invitee) external {
        require(isMember[circleId][msg.sender], "FriendCircle: not a member");
        require(!isMember[circleId][invitee], "FriendCircle: already a member");
        require(circles[circleId].isActive, "FriendCircle: circle inactive");

        pendingInvites[circleId][invitee] = true;
        emit InviteSent(circleId, invitee, msg.sender);
    }

    /// @notice Accept an invitation to join a circle
    function acceptInvite(uint256 circleId) external {
        require(pendingInvites[circleId][msg.sender], "FriendCircle: no pending invite");
        require(!isMember[circleId][msg.sender], "FriendCircle: already a member");

        pendingInvites[circleId][msg.sender] = false;
        isMember[circleId][msg.sender] = true;
        circles[circleId].members.push(msg.sender);
        userCircles[msg.sender].push(circleId);

        emit MemberJoined(circleId, msg.sender);
    }

    /// @notice Leave a circle
    function leaveCircle(uint256 circleId) external {
        require(isMember[circleId][msg.sender], "FriendCircle: not a member");
        require(circles[circleId].creator != msg.sender, "FriendCircle: creator cannot leave");

        isMember[circleId][msg.sender] = false;

        // Remove from members array
        address[] storage members = circles[circleId].members;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == msg.sender) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }

        emit MemberLeft(circleId, msg.sender);
    }

    /// @notice Get all members of a circle
    function getCircleMembers(uint256 circleId) external view returns (address[] memory) {
        return circles[circleId].members;
    }

    /// @notice Get all circles a user belongs to
    function getUserCircles(address user) external view returns (uint256[] memory) {
        return userCircles[user];
    }

    /// @notice Get circle details
    function getCircle(uint256 circleId) external view returns (
        string memory name,
        address creator,
        address[] memory members,
        bool isActive,
        uint256 createdAt
    ) {
        Circle storage circle = circles[circleId];
        return (circle.name, circle.creator, circle.members, circle.isActive, circle.createdAt);
    }

    /// @notice Get the number of members in a circle
    function getMemberCount(uint256 circleId) external view returns (uint256) {
        return circles[circleId].members.length;
    }
}
