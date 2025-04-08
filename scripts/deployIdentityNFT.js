const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying IdentityNFT with account:", deployer.address);

  const IdentityNFT = await hre.ethers.getContractFactory("IdentityNFT");
  const identityNFT = await IdentityNFT.deploy();

  await identityNFT.waitForDeployment();
  const identityNFTAddress = await identityNFT.getAddress();
  console.log("IdentityNFT deployed to:", identityNFTAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });