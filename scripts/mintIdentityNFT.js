const hre = require("hardhat");

async function main() {
  const contractAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA"; // "0xYourDeployedContractAddress" 
  const IdentityNFT = await hre.ethers.getContractFactory("IdentityNFT");
  const identityNFT = await IdentityNFT.attach(contractAddress);

  const userAddress = "0x80D9980F4A19De0876Dc3Cf90A261Fd0d3D06A69"; //"0xTestUserAddress"
  const role = "student";
  const uri = "ipfs://QmZp19VbXBfKT6jaX91fGDH9EdxyjdXqHnsKwyDDsv87Sc"; //"ipfs://QmYourHashHere"

  await identityNFT.mintIdentity(userAddress, role, uri);
  console.log("Minted NFT for", userAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });