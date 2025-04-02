import { ethers } from "ethers";
import { useState } from "react";
import IdentityNFTArtifact from "./IdentityNFT.json"; // Adjust the path as necessary

const IdentityNFTABI = IdentityNFTArtifact.abi; // Extract the ABI array
const contractAddress = "0xbDb0270A04Dc10d404046dA91cc6d471744E7F26";

function App() {
  const [account, setAccount] = useState(null);
  const [nftData, setNftData] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);

        // Use the extracted ABI array here
        const contract = new ethers.Contract(
          contractAddress,
          IdentityNFTABI,
          provider
        );
        const balance = await contract.balanceOf(accounts[0]);

        if (Number(balance) > 0) {
          const tokenId = await contract.tokenOfOwnerByIndex(accounts[0], 0);
          const uri = await contract.tokenURI(tokenId);
          const role = await contract.roles(tokenId);
          const isActive = await contract.isActive(tokenId);
          setNftData({ tokenId: tokenId.toString(), uri, role, isActive });
        }
      } catch (error) {
        console.error(
          "Error connecting to wallet or fetching NFT data:",
          error
        );
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Rest of your component (e.g., JSX rendering)
  return (
    <div>
      <button onClick={connectWallet}>Connect Wallet</button>
      {account && <p>Connected: {account}</p>}
      {nftData ? (
        <div>
          <p>Token ID: {nftData.tokenId}</p>
          <p>URI: {nftData.uri}</p>
          <p>Role: {nftData.role}</p>
          <p>Active: {nftData.isActive.toString()}</p>
        </div>
      ) : (
        account && <p>No NFT found for this account.</p>
      )}
    </div>
  );
}

export default App;
