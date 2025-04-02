const { expect } = require("chai");

describe("IdentityNFT", function () {
  let IdentityNFT, identityNFT, owner, student;

  beforeEach(async function () {
    // Deploy a fresh contract before each test
    IdentityNFT = await ethers.getContractFactory("IdentityNFT");
    [owner, student] = await ethers.getSigners(); // Get test accounts
    identityNFT = await IdentityNFT.deploy();
  });

  it("Should mint a new NFT", async function () {
    const uri = "ipfs://QmTestHash";
    await identityNFT.mintIdentity(student.address, "student", uri);
    expect(await identityNFT.ownerOf(1)).to.equal(student.address);
    expect(await identityNFT.roles(1)).to.equal("student");
    expect(await identityNFT.isActive(1)).to.equal(true);
    expect(await identityNFT.tokenURI(1)).to.equal(uri);
  });

  it("Should prevent transfers", async function () {
    const uri = "ipfs://QmTestHash";
    await identityNFT.mintIdentity(student.address, "student", uri);
    await expect(
      identityNFT.connect(student).transferFrom(student.address, owner.address, 1)
    ).to.be.revertedWith("Tokens are soulbound and cannot be transferred");
  });
});