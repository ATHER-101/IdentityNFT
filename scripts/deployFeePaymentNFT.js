const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying FeePaymentNFT with account:", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has no ETH. Please fund the account.");
  }

  // Replace with your actual deployed IdentityNFT address
  const idNFTContract = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA";
  // Use deployer address as treasury for simplicity, or replace with another address
  const collegeTreasury = deployer.address;

  // Deploy FeePaymentNFT (corrected contract name)
  const FeePaymentNFT = await hre.ethers.getContractFactory("FeePaymentNFT");
  console.log("Deploying FeePaymentNFT...");
  const feePaymentNFT = await FeePaymentNFT.deploy(collegeTreasury, idNFTContract);

  await feePaymentNFT.waitForDeployment();
  const feePaymentNFTAddress = await feePaymentNFT.getAddress();
  console.log("FeePaymentNFT deployed to:", feePaymentNFTAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  });