const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FeePaymentNFT", function () {
  let FeePaymentNFT, IdentityNFT, feePaymentNFT, identityNFT;
  let owner, student, treasury;

  beforeEach(async function () {
    // Get signers
    [owner, student, treasury] = await ethers.getSigners();

    // Deploy IdentityNFT mock
    const IdentityNFTFactory = await ethers.getContractFactory("IdentityNFT");
    identityNFT = await IdentityNFTFactory.deploy();
    await identityNFT.waitForDeployment();

    // Mint an IdentityNFT to the student
    await identityNFT.mintIdentity(student.address, "student", "ipfs://QmTest");

    // Deploy FeePaymentNFT (corrected contract name)
    const FeePaymentNFTFactory = await ethers.getContractFactory("FeePaymentNFT");
    feePaymentNFT = await FeePaymentNFTFactory.deploy(treasury.address, identityNFT.getAddress());
    await feePaymentNFT.waitForDeployment();
  });

  it("should deploy with correct treasury and idNFTContract addresses", async function () {
    expect(await feePaymentNFT.collegeTreasury()).to.equal(treasury.address);
    expect(await feePaymentNFT.idNFTContract()).to.equal(await identityNFT.getAddress());
  });

  it("should allow a student with IdentityNFT to pay fees", async function () {
    const semester = "Spring 2025";
    const metadataURI = "ipfs://QmFeeTest";
    const feeAmount = ethers.parseEther("0.1");

    // Pay fee
    await expect(
      feePaymentNFT.connect(student).payFee(semester, metadataURI, { value: feeAmount })
    )
      .to.emit(feePaymentNFT, "FeePaid")
      .withArgs(student.address, 1, feeAmount, semester);

    // Check token ownership
    expect(await feePaymentNFT.ownerOf(1)).to.equal(student.address);
    expect(await feePaymentNFT.tokenURI(1)).to.equal(metadataURI);
    expect(await feePaymentNFT.activeFeeNFT(student.address)).to.equal(1);

    // Check treasury balance (using BigInt arithmetic)
    const initialBalance = ethers.parseEther("10000"); // Hardhat default balance
    const expectedBalance = initialBalance + feeAmount; // BigInt addition
    const treasuryBalance = await ethers.provider.getBalance(treasury.address);
    expect(treasuryBalance).to.equal(expectedBalance);
  });

  it("should burn old FeeNFT and mint new one on second payment", async function () {
    const feeAmount = ethers.parseEther("0.1");

    // First payment
    await feePaymentNFT.connect(student).payFee("Fall 2024", "ipfs://QmOld", { value: feeAmount });
    expect(await feePaymentNFT.activeFeeNFT(student.address)).to.equal(1);

    // Second payment
    await feePaymentNFT.connect(student).payFee("Spring 2025", "ipfs://QmNew", { value: feeAmount });
    expect(await feePaymentNFT.activeFeeNFT(student.address)).to.equal(2);

    // Old token should be burned, expect revert when querying ownerOf
    await expect(feePaymentNFT.ownerOf(1)).to.be.reverted; // More general check
    expect(await feePaymentNFT.ownerOf(2)).to.equal(student.address);
  });

  it("should revert if student has no IdentityNFT", async function () {
    const noIdentityUser = (await ethers.getSigners())[3];
    const feeAmount = ethers.parseEther("0.1");

    await expect(
      feePaymentNFT.connect(noIdentityUser).payFee("Spring 2025", "ipfs://QmTest", { value: feeAmount })
    ).to.be.revertedWith("You must own a valid ID NFT to pay fees");
  });

  it("should revert if fee amount is 0", async function () {
    await expect(
      feePaymentNFT.connect(student).payFee("Spring 2025", "ipfs://QmTest", { value: 0 })
    ).to.be.revertedWith("Fee must be greater than 0");
  });

  it("should prevent transfers (soulbound)", async function () {
    const feeAmount = ethers.parseEther("0.1");
    await feePaymentNFT.connect(student).payFee("Spring 2025", "ipfs://QmTest", { value: feeAmount });

    await expect(
      feePaymentNFT.connect(student).transferFrom(student.address, owner.address, 1)
    ).to.be.revertedWith("Semester Fee NFTs are soulbound and cannot be transferred");
  });

  it("should verify fee paid status", async function () {
    const feeAmount = ethers.parseEther("0.1");
    await feePaymentNFT.connect(student).payFee("Spring 2025", "ipfs://QmTest", { value: feeAmount });

    expect(await feePaymentNFT.verifyFeePaid(student.address)).to.be.true;
    expect(await feePaymentNFT.verifyFeePaid(owner.address)).to.be.false;
  });
});