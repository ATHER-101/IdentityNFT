import { useState } from "react";
import { ethers } from "ethers";
import IdentityNFTArtifact from "../ABI/IdentityNFT.json";
import { Link } from "react-router-dom";

const identityNFTAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA";
const IdentityNFTABI = IdentityNFTArtifact.abi;

function Home({nftData, setNftData}) {
  const [account, setAccount] = useState(null);
  const [message, setMessage] = useState("");

  const fetchIPFSMetadata = async (uri) => {
    const ipfsHash = uri.replace("ipfs://", "");
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch IPFS metadata");
    return await response.json();
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);

      const identityNFT = new ethers.Contract(identityNFTAddress, IdentityNFTABI, provider);
      const balance = await identityNFT.balanceOf(accounts[0]);

      if (Number(balance) > 0) {
        const tokenId = await identityNFT.tokenOfOwnerByIndex(accounts[0], 0);
        const uri = await identityNFT.tokenURI(tokenId);
        const role = await identityNFT.roles(tokenId);
        const isActive = await identityNFT.isActive(tokenId);
        const metadata = await fetchIPFSMetadata(uri);
        setNftData({ tokenId: tokenId.toString(), uri, role, isActive, name: metadata.name });
      } else {
        setNftData(null);
        setMessage("No IdentityNFT found. You need one to pay fees.");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setMessage(`Failed to connect wallet: ${error.message}`);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold mb-4 text-center">Welcome to Blockchain Project</h1>
      <button
        onClick={connectWallet}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mb-4"
      >
        Connect Wallet
      </button>
      {account && <p className="text-sm mb-4">Connected: {account}</p>}

      {nftData ? (
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Identity NFT</h3>
          <p>Name: {nftData.name}</p>
          <p>Token ID: {nftData.tokenId}</p>
          <p>Role: {nftData.role}</p>
          <p>Active: {nftData.isActive.toString()}</p>
        </div>
      ) : (
        account && <p>No Identity NFT found.</p>
      )}

      {message && (
        <p className={`mt-4 text-sm ${message.toLowerCase().includes("failed") ? "text-red-400" : "text-yellow-300"}`}>
          {message}
        </p>
      )}

      <Link to={"/fee-payment"}>
        <div className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mt-4 text-center">
          Fee Payment
        </div>
      </Link>
      
      <Link to={"/register-course"}>
        <div className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mt-4 text-center">
          Register Course
        </div>
      </Link>
      
      <Link to={"/course-dashboard"}>
        <div className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mt-4 text-center">
          Course Dashboard
        </div>
      </Link>
      
      <Link to={"/amenities-access"}>
        <div className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mt-4 text-center">
          Amenities Access
        </div>
      </Link>
      
      <Link to={"/admin-access-points"}>
        <div className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mt-4 text-center">
          Admin Access Points
        </div>
      </Link>
      
      <Link to={"/marketplace"}>
        <div className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition mt-4 text-center">
          Marketplace
        </div>
      </Link>
    </div>
  );
}

export default Home;