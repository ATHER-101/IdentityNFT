const hre = require("hardhat");

async function main() {
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying RewardNFTMarketplace with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has no ETH. Please fund the account.");
  }

  // Replace with your actual deployed RewardNFT and IdentityNFT addresses
  const rewardNFTContractAddress = "0x0106d429EE11e088a1529C51003615d443f8c45d"; // Replace with actual RewardNFT address
  const idNFTContractAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA"; // Replace with actual IdentityNFT address

  // Deploy RewardNFTMarketplace
  const RewardNFTMarketplace = await hre.ethers.getContractFactory("RewardNFTMarketplace");
  console.log("Deploying RewardNFTMarketplace...");
  const marketplace = await RewardNFTMarketplace.deploy(
    rewardNFTContractAddress,
    idNFTContractAddress
  );

  // Wait for deployment to complete
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("RewardNFTMarketplace deployed to:", marketplaceAddress);

  // Optional: Verify the deployed contract's configuration
  console.log("Verifying contract configuration...");
  const deployedRewardNFT = await marketplace.rewardNFTContract();
  const deployedIdNFT = await marketplace.idNFTContract();
  console.log("RewardNFT address in contract:", deployedRewardNFT);
  console.log("IdentityNFT address in contract:", deployedIdNFT);

  if (deployedRewardNFT !== rewardNFTContractAddress || deployedIdNFT !== idNFTContractAddress) {
    throw new Error("Deployed contract addresses do not match provided addresses!");
  }

  console.log("Deployment successful and verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  });