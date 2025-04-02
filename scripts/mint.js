const hre = require("hardhat");

async function main() {
  const contractAddress = "0xbDb0270A04Dc10d404046dA91cc6d471744E7F26"; // "0xYourDeployedContractAddress" 
  const IdentityNFT = await hre.ethers.getContractFactory("IdentityNFT");
  const identityNFT = await IdentityNFT.attach(contractAddress);

  const userAddress = "0x1089FC7842fFf4d87e490819e0A6A10Bbaa76595"; //"0xTestUserAddress"
  const role = "student";
  const uri = "ipfs://QmP7CuUKXhoYZZyigJsPSx2iswFYyWXBirQwLRzCmTHJoD"; //"ipfs://QmYourHashHere"

  await identityNFT.mintIdentity(userAddress, role, uri);
  console.log("Minted NFT for", userAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });