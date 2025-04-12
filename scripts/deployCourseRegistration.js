const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying CourseRegistration with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has no ETH. Please fund the account.");
  }

  // Replace with your actual deployed IdentityNFT and FeePaymentNFT addresses
  const idNFTContractAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA"; // Example IdentityNFT address
  const feePaymentNFTContractAddress = "0xCc72ffDf6fdD0DEe66a39e5b9BE0cb9a4699AE0B"; // Replace with actual FeePaymentNFT address

  // Deploy CourseRegistration
  const CourseRegistration = await hre.ethers.getContractFactory("CourseRegistration");
  console.log("Deploying CourseRegistration...");
  const courseRegistration = await CourseRegistration.deploy(
    idNFTContractAddress,
    feePaymentNFTContractAddress
  );

  await courseRegistration.waitForDeployment();
  const courseRegistrationAddress = await courseRegistration.getAddress();
  console.log("CourseRegistration deployed to:", courseRegistrationAddress);

  // Get addresses of the auto-deployed NFT contracts
  const registrationNFTAddress = await courseRegistration.registrationNFT();
  const completionNFTAddress = await courseRegistration.completionNFT();

  console.log("CourseRegistrationNFT deployed to:", registrationNFTAddress);
  console.log("CourseCompletionNFT deployed to:", completionNFTAddress);

  // Optional: Verify the deployed contract's configuration
  console.log("Verifying contract configuration...");
  const deployedIdNFT = await courseRegistration.idNFTContract();
  const deployedFeePaymentNFT = await courseRegistration.feePaymentNFTContract();
  console.log("IdentityNFT address in contract:", deployedIdNFT);
  console.log("FeePaymentNFT address in contract:", deployedFeePaymentNFT);

  if (deployedIdNFT !== idNFTContractAddress || deployedFeePaymentNFT !== feePaymentNFTContractAddress) {
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