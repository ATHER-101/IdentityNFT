const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying RewardNFT with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has no ETH. Please fund the account.");
  }

  // Use the deployed IdentityNFT address provided
  const idNFTContract = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA"; // Replace with your deployed IdentityNFT address

  // Deploy RewardNFT
  const RewardNFT = await hre.ethers.getContractFactory("RewardNFT");
  console.log("Deploying RewardNFT...");
  const rewardNFT = await RewardNFT.deploy(idNFTContract);

  await rewardNFT.waitForDeployment();
  const rewardNFTAddress = await rewardNFT.getAddress();
  console.log("RewardNFT deployed to:", rewardNFTAddress);

  // Optional: Verify contract on Etherscan (if on a public network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations before verification...");
    await rewardNFT.deploymentTransaction().wait(6); // Wait for 6 confirmations
    try {
      await hre.run("verify:verify", {
        address: rewardNFTAddress,
        constructorArguments: [idNFTContract],
      });
      console.log("RewardNFT verified on Etherscan");
    } catch (error) {
      console.error("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  });