// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GoalToken (GSTK)
 * @notice The native token for GoalStake platform.
 *         Used to stake on friends' goals and earn rewards.
 *         Users receive an initial airdrop when they join the platform.
 */
contract GoalToken is ERC20, Ownable {
    uint256 public constant INITIAL_AIRDROP = 1000 * 10 ** 18; // 1000 tokens per new user
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18; // 1B max supply

    mapping(address => bool) public hasClaimed;
    mapping(address => bool) public authorizedMinters;

    event AirdropClaimed(address indexed user, uint256 amount);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);

    constructor() ERC20("GoalStake Token", "GSTK") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 100_000_000 * 10 ** 18);
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedMinters[msg.sender],
            "GoalToken: not authorized"
        );
        _;
    }

    function authorizeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }

    function revokeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }

    /// @notice New users claim their initial airdrop of GSTK tokens
    function claimAirdrop() external {
        require(!hasClaimed[msg.sender], "GoalToken: already claimed");
        require(
            totalSupply() + INITIAL_AIRDROP <= MAX_SUPPLY,
            "GoalToken: max supply exceeded"
        );

        hasClaimed[msg.sender] = true;
        _mint(msg.sender, INITIAL_AIRDROP);

        emit AirdropClaimed(msg.sender, INITIAL_AIRDROP);
    }

    /// @notice Authorized contracts (GoalMarket) can mint reward tokens
    function mint(address to, uint256 amount) external onlyAuthorized {
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "GoalToken: max supply exceeded"
        );
        _mint(to, amount);
    }

    /// @notice Anyone can burn their own tokens
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
