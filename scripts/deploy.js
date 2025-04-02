const hre = require("hardhat");

async function main() {
  const IdentityNFT = await hre.ethers.getContractFactory("IdentityNFT");
  const identityNFT = await IdentityNFT.deploy();

  await identityNFT.waitForDeployment(); // ✅ FIXED

  console.log("IdentityNFT deployed to:", await identityNFT.getAddress()); // ✅ FIXED
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });