const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RewardNFT", function () {
  let RewardNFT, IdentityNFT, rewardNFT, identityNFT;
  let owner, student1, student2, nonStudent;

  beforeEach(async function () {
    [owner, student1, student2, nonStudent] = await ethers.getSigners();

    const IdentityNFTFactory = await ethers.getContractFactory("IdentityNFT");
    identityNFT = await IdentityNFTFactory.deploy();
    await identityNFT.waitForDeployment();

    await identityNFT.mintIdentity(student1.address, "student", "ipfs://metadata1");
    await identityNFT.mintIdentity(student2.address, "student", "ipfs://metadata2");

    const RewardNFTFactory = await ethers.getContractFactory("RewardNFT");
    rewardNFT = await RewardNFTFactory.deploy(await identityNFT.getAddress());
    await rewardNFT.waitForDeployment();
  });

  it("should deploy with correct IdentityNFT address", async function () {
    expect(await rewardNFT.idNFTContract()).to.equal(await identityNFT.getAddress());
    expect(await rewardNFT.owner()).to.equal(owner.address);
  });

  it("should allow admin to mint a single NFT", async function () {
    await expect(rewardNFT.mintReward(student1.address))
      .to.emit(rewardNFT, "RewardMinted")
      .withArgs(student1.address, 1);
    expect(await rewardNFT.ownerOf(1)).to.equal(student1.address);
    expect(await rewardNFT.getCurrentTokenId()).to.equal(1);
    expect(await rewardNFT.balanceOf(student1.address)).to.equal(1);
  });

  it("should allow admin to mint multiple NFTs", async function () {
    await expect(rewardNFT.mintMultipleRewards(student1.address, 3))
      .to.emit(rewardNFT, "RewardMinted")
      .withArgs(student1.address, 1)
      .to.emit(rewardNFT, "RewardMinted")
      .withArgs(student1.address, 2)
      .to.emit(rewardNFT, "RewardMinted")
      .withArgs(student1.address, 3);
    expect(await rewardNFT.ownerOf(1)).to.equal(student1.address);
    expect(await rewardNFT.ownerOf(2)).to.equal(student1.address);
    expect(await rewardNFT.ownerOf(3)).to.equal(student1.address);
    expect(await rewardNFT.getCurrentTokenId()).to.equal(3);
    expect(await rewardNFT.balanceOf(student1.address)).to.equal(3);
  });

  it("should reuse admin tokens for single mint", async function () {
    await rewardNFT.mintReward(student1.address);
    await rewardNFT.connect(student1).useReward(1);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([1n]);

    await expect(rewardNFT.mintReward(student2.address))
      .to.emit(rewardNFT, "RewardReused")
      .withArgs(student2.address, 1);
    expect(await rewardNFT.ownerOf(1)).to.equal(student2.address);
    expect(await rewardNFT.getCurrentTokenId()).to.equal(1);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([]);
  });

  it("should reuse admin tokens then mint for multiple mints", async function () {
    await rewardNFT.mintReward(student1.address);
    await rewardNFT.connect(student1).useReward(1);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([1n]);

    await expect(rewardNFT.mintMultipleRewards(student2.address, 2))
      .to.emit(rewardNFT, "RewardReused")
      .withArgs(student2.address, 1)
      .to.emit(rewardNFT, "RewardMinted")
      .withArgs(student2.address, 2);
    expect(await rewardNFT.ownerOf(1)).to.equal(student2.address);
    expect(await rewardNFT.ownerOf(2)).to.equal(student2.address);
    expect(await rewardNFT.getCurrentTokenId()).to.equal(2);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([]);
  });

  it("should allow student to use reward", async function () {
    await rewardNFT.mintReward(student1.address);
    await expect(rewardNFT.connect(student1).useReward(1))
      .to.emit(rewardNFT, "RewardUsed")
      .withArgs(student1.address, 1);
    expect(await rewardNFT.ownerOf(1)).to.equal(owner.address);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([1n]);
  });

  it("should allow transfer between students with IdentityNFT", async function () {
    await rewardNFT.mintReward(student1.address);
    await rewardNFT.connect(student1).transferFrom(student1.address, student2.address, 1);
    expect(await rewardNFT.ownerOf(1)).to.equal(student2.address);
    expect(await rewardNFT.balanceOf(student1.address)).to.equal(0);
    expect(await rewardNFT.balanceOf(student2.address)).to.equal(1);
  });

  it("should revert transfer to non-IdentityNFT holder", async function () {
    await rewardNFT.mintReward(student1.address);
    await expect(
      rewardNFT.connect(student1).transferFrom(student1.address, nonStudent.address, 1)
    ).to.be.revertedWith("Recipient must own an IdentityNFT");
    expect(await rewardNFT.ownerOf(1)).to.equal(student1.address);
  });

  it("should allow transfer to admin without IdentityNFT", async function () {
    await rewardNFT.mintReward(student1.address);
    await rewardNFT.connect(student1).useReward(1);
    expect(await rewardNFT.ownerOf(1)).to.equal(owner.address);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([1n]);
  });

  it("should revert minting to non-IdentityNFT holder", async function () {
    await expect(rewardNFT.mintReward(nonStudent.address)).to.be.revertedWith(
      "Student must own an IdentityNFT"
    );
    await expect(rewardNFT.mintMultipleRewards(nonStudent.address, 2)).to.be.revertedWith(
      "Student must own an IdentityNFT"
    );
  });

  it("should revert minting with invalid parameters", async function () {
    await expect(rewardNFT.mintReward(ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid student address"
    );
    await expect(rewardNFT.mintMultipleRewards(student1.address, 0)).to.be.revertedWith(
      "Number of NFTs must be greater than 0"
    );
    await expect(rewardNFT.mintMultipleRewards(ethers.ZeroAddress, 1)).to.be.revertedWith(
      "Invalid student address"
    );
  });

  it("should revert useReward by non-owner", async function () {
    await rewardNFT.mintReward(student1.address);
    await expect(rewardNFT.connect(student2).useReward(1)).to.be.revertedWith(
      "You do not own this NFT"
    );
  });

  it("should allow admin to update IdentityNFT contract address", async function () {
    const newIdentityNFTFactory = await ethers.getContractFactory("IdentityNFT");
    const newIdentityNFT = await newIdentityNFTFactory.deploy();
    await newIdentityNFT.waitForDeployment();

    await rewardNFT.setIdNFTContract(await newIdentityNFT.getAddress());
    expect(await rewardNFT.idNFTContract()).to.equal(await newIdentityNFT.getAddress());
  });

  it("should revert setIdNFTContract by non-owner", async function () {
    const newIdentityNFTFactory = await ethers.getContractFactory("IdentityNFT");
    const newIdentityNFT = await newIdentityNFTFactory.deploy();
    await newIdentityNFT.waitForDeployment();

    await expect(
      rewardNFT.connect(student1).setIdNFTContract(await newIdentityNFT.getAddress())
    ).to.be.revertedWithCustomError(rewardNFT, "OwnableUnauthorizedAccount");
  });

  it("should return correct admin tokens", async function () {
    await rewardNFT.mintReward(student1.address);
    expect(await rewardNFT.ownerOf(1)).to.equal(student1.address);
    expect(await rewardNFT.getCurrentTokenId()).to.equal(1);

    await rewardNFT.connect(student1).useReward(1);
    expect(await rewardNFT.ownerOf(1)).to.equal(owner.address);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([1n]);

    await rewardNFT.mintReward(student2.address); // Reuses token 1
    expect(await rewardNFT.ownerOf(1)).to.equal(student2.address);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([]);

    await rewardNFT.connect(student2).useReward(1);
    expect(await rewardNFT.getAdminTokens()).to.deep.equal([1n]);

    await rewardNFT.mintReward(student1.address); // Mints token 2
    expect(await rewardNFT.ownerOf(2)).to.equal(student1.address);
    expect(await rewardNFT.getCurrentTokenId()).to.equal(2);

    await rewardNFT.connect(student1).useReward(2);
    expect(await rewardNFT.ownerOf(2)).to.equal(owner.address);

    expect(await rewardNFT.getAdminTokens()).to.deep.equal([1n, 2n]);
  });
});