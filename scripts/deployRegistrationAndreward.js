const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has no ETH. Please fund the account.");
  }

  // Existing contract addresses (replace with actual deployed addresses)
  const idNFTContract = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA"; // IdentityNFT address
  const feePaymentNFTContract = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA"; // FeePaymentNFT address

  // Deploy RewardNFT
  const RewardNFT = await hre.ethers.getContractFactory("RewardNFT");
  console.log("Deploying RewardNFT...");
  const rewardNFT = await RewardNFT.deploy(idNFTContract);
  await rewardNFT.waitForDeployment();
  const rewardNFTAddress = await rewardNFT.getAddress();
  console.log("RewardNFT deployed to:", rewardNFTAddress);

  // Deploy CourseRegistration
  const CourseRegistration = await hre.ethers.getContractFactory("CourseRegistration");
  console.log("Deploying CourseRegistration...");
  const courseRegistration = await CourseRegistration.deploy(
    idNFTContract,
    feePaymentNFTContract,
    rewardNFTAddress
  );
  await courseRegistration.waitForDeployment();
  const courseRegistrationAddress = await courseRegistration.getAddress();
  console.log("CourseRegistration deployed to:", courseRegistrationAddress);

  // Get addresses of child contracts
  const registrationNFTAddress = await courseRegistration.registrationNFT();
  const completionNFTAddress = await courseRegistration.completionNFT();
  console.log("CourseRegistrationNFT deployed to:", registrationNFTAddress);
  console.log("CourseCompletionNFT deployed to:", completionNFTAddress);

  // Authorize CourseRegistration to mint RewardNFTs
  console.log("Authorizing CourseRegistration to mint RewardNFTs...");
  const tx = await rewardNFT.addAuthorizedCaller(courseRegistrationAddress);
  const receipt = await tx.wait(); // Wait for transaction confirmation
  console.log("Authorization transaction hash:", receipt.hash);
  const authorizedStatus = await rewardNFT.authorizedCallers(courseRegistrationAddress);
  console.log("CourseRegistration authorized. Authorized status:", authorizedStatus);

  if (!authorizedStatus) {
    throw new Error("Failed to authorize CourseRegistration. Check RewardNFT owner or transaction logs.");
  }

  // Verify on Etherscan (if on a public network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations before verification...");
    await rewardNFT.deploymentTransaction().wait(6);
    await courseRegistration.deploymentTransaction().wait(6);

    try {
      await hre.run("verify:verify", {
        address: rewardNFTAddress,
        constructorArguments: [idNFTContract],
      });
      console.log("RewardNFT verified on Etherscan");
    } catch (error) {
      console.error("RewardNFT verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: courseRegistrationAddress,
        constructorArguments: [idNFTContract, feePaymentNFTContract, rewardNFTAddress],
      });
      console.log("CourseRegistration verified on Etherscan");
    } catch (error) {
      console.error("CourseRegistration verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: registrationNFTAddress,
        constructorArguments: [courseRegistrationAddress],
      });
      console.log("CourseRegistrationNFT verified on Etherscan");
    } catch (error) {
      console.error("CourseRegistrationNFT verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: completionNFTAddress,
        constructorArguments: [courseRegistrationAddress],
      });
      console.log("CourseCompletionNFT verified on Etherscan");
    } catch (error) {
      console.error("CourseCompletionNFT verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  });