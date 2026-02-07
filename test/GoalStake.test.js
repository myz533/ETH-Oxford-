const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoalStake Protocol", function () {
  let goalToken, friendCircle, goalMarket;
  let owner, alice, bob, charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy GoalToken
    const GoalToken = await ethers.getContractFactory("GoalToken");
    goalToken = await GoalToken.deploy();
    await goalToken.waitForDeployment();

    // Deploy FriendCircle
    const FriendCircle = await ethers.getContractFactory("FriendCircle");
    friendCircle = await FriendCircle.deploy();
    await friendCircle.waitForDeployment();

    // Deploy GoalMarket
    const GoalMarket = await ethers.getContractFactory("GoalMarket");
    goalMarket = await GoalMarket.deploy(
      await goalToken.getAddress(),
      await friendCircle.getAddress()
    );
    await goalMarket.waitForDeployment();

    // Authorize GoalMarket as minter
    await goalToken.authorizeMinter(await goalMarket.getAddress());

    // Give tokens to users
    const amount = ethers.parseEther("1000");
    await goalToken.transfer(alice.address, amount);
    await goalToken.transfer(bob.address, amount);
    await goalToken.transfer(charlie.address, amount);
  });

  describe("GoalToken", function () {
    it("should have correct name and symbol", async function () {
      expect(await goalToken.name()).to.equal("GoalStake Token");
      expect(await goalToken.symbol()).to.equal("GSTK");
    });

    it("should allow users to claim airdrop", async function () {
      const addr = (await ethers.getSigners())[5];
      await goalToken.connect(addr).claimAirdrop();
      expect(await goalToken.balanceOf(addr.address)).to.equal(ethers.parseEther("1000"));
    });

    it("should prevent double claiming", async function () {
      const addr = (await ethers.getSigners())[5];
      await goalToken.connect(addr).claimAirdrop();
      await expect(goalToken.connect(addr).claimAirdrop()).to.be.revertedWith(
        "GoalToken: already claimed"
      );
    });
  });

  describe("FriendCircle", function () {
    it("should create a circle", async function () {
      await friendCircle.connect(alice).createCircle("Gym Bros");
      const circle = await friendCircle.getCircle(1);
      expect(circle.name).to.equal("Gym Bros");
      expect(circle.creator).to.equal(alice.address);
      expect(circle.members.length).to.equal(1);
    });

    it("should handle invites and joins", async function () {
      await friendCircle.connect(alice).createCircle("Study Group");
      await friendCircle.connect(alice).inviteToCircle(1, bob.address);
      await friendCircle.connect(bob).acceptInvite(1);

      expect(await friendCircle.isMember(1, bob.address)).to.be.true;
      expect(await friendCircle.getMemberCount(1)).to.equal(2);
    });
  });

  describe("GoalMarket", function () {
    beforeEach(async function () {
      // Create a circle with all users
      await friendCircle.connect(alice).createCircle("Test Circle");
      await friendCircle.connect(alice).inviteToCircle(1, bob.address);
      await friendCircle.connect(bob).acceptInvite(1);
      await friendCircle.connect(alice).inviteToCircle(1, charlie.address);
      await friendCircle.connect(charlie).acceptInvite(1);

      // Approve token spending
      const marketAddr = await goalMarket.getAddress();
      await goalToken.connect(alice).approve(marketAddr, ethers.parseEther("10000"));
      await goalToken.connect(bob).approve(marketAddr, ethers.parseEther("10000"));
      await goalToken.connect(charlie).approve(marketAddr, ethers.parseEther("10000"));
    });

    it("should create a goal with stake", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days
      await goalMarket
        .connect(alice)
        .createGoal(1, "Run 5K", "Complete a 5K run", deadline, ethers.parseEther("50"));

      const goal = await goalMarket.getGoal(1);
      expect(goal.title).to.equal("Run 5K");
      expect(goal.creator).to.equal(alice.address);
      expect(goal.yesPool).to.equal(ethers.parseEther("50"));
    });

    it("should allow friends to take positions", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 7;
      await goalMarket
        .connect(alice)
        .createGoal(1, "Run 5K", "", deadline, ethers.parseEther("50"));

      // Bob bets YES
      await goalMarket.connect(bob).takePosition(1, true, ethers.parseEther("30"));
      // Charlie bets NO
      await goalMarket.connect(charlie).takePosition(1, false, ethers.parseEther("20"));

      const goal = await goalMarket.getGoal(1);
      expect(goal.yesPool).to.equal(ethers.parseEther("80")); // 50 + 30
      expect(goal.noPool).to.equal(ethers.parseEther("20"));

      // Implied probability = 80/(80+20) = 80%
      const prob = await goalMarket.getImpliedProbability(1);
      expect(prob).to.equal(8000n); // 80%
    });

    it("should handle proof submission and verification", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 7;
      await goalMarket
        .connect(alice)
        .createGoal(1, "Run 5K", "", deadline, ethers.parseEther("50"));

      // Submit proof
      await goalMarket.connect(alice).submitProof(1, "ipfs://proof123");
      let goal = await goalMarket.getGoal(1);
      expect(goal.status).to.equal(1n); // ProofSubmitted

      // Verify (need >50% of non-creator members)
      await goalMarket.connect(bob).verifyGoal(1, true);

      goal = await goalMarket.getGoal(1);
      // With 3 members, quorum = ceil((3-0)*50%) = 2, but since bob is 1st voter
      // check if quorum is met
      expect(goal.verifyYes).to.equal(1n);
    });
  });
});
