import { ethers } from "ethers";
import { useState } from "react";
import IdentityNFTArtifact from "./IdentityNFT.json"; // Adjust path
import FeePaymentNFTArtifact from "./FeePaymentNFT.json"; // Adjust path

const IdentityNFTABI = IdentityNFTArtifact.abi;
const FeePaymentNFTABI = FeePaymentNFTArtifact.abi;

const identityNFTAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA"; // Your IdentityNFT address
const feePaymentNFTAddress = "0xCc72ffDf6fdD0DEe66a39e5b9BE0cb9a4699AE0B"; // Replace with your deployed FeePaymentNFT address

function App() {
  const [account, setAccount] = useState(null);
  const [nftData, setNftData] = useState(null);
  const [semester, setSemester] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [message, setMessage] = useState("");
  const [feeStatus, setFeeStatus] = useState(null);

  // Connect wallet and check IdentityNFT
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);

      // Check IdentityNFT
      const identityNFT = new ethers.Contract(
        identityNFTAddress,
        IdentityNFTABI,
        provider
      );
      const balance = await identityNFT.balanceOf(accounts[0]);

      if (Number(balance) > 0) {
        const tokenId = await identityNFT.tokenOfOwnerByIndex(accounts[0], 0);
        const uri = await identityNFT.tokenURI(tokenId);
        const role = await identityNFT.roles(tokenId);
        const isActive = await identityNFT.isActive(tokenId);
        setNftData({ tokenId: tokenId.toString(), uri, role, isActive });
      } else {
        setNftData(null);
      }

      // Check fee status
      const feePaymentNFT = new ethers.Contract(
        feePaymentNFTAddress,
        FeePaymentNFTABI,
        provider
      );
      const hasPaid = await feePaymentNFT.verifyFeePaid(accounts[0]);
      setFeeStatus(hasPaid);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setMessage("Failed to connect wallet or fetch data.");
    }
  };

  // Pay fee function
  const payFee = async () => {
    if (!account) {
      setMessage("Please connect your wallet first!");
      return;
    }
    if (!semester || !metadataURI || !feeAmount) {
      setMessage("Please fill in all fields!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const feePaymentNFT = new ethers.Contract(
        feePaymentNFTAddress,
        FeePaymentNFTABI,
        signer
      );

      const tx = await feePaymentNFT.payFee(semester, metadataURI, {
        value: ethers.parseUnits(feeAmount, "gwei"),
      });
      setMessage("Transaction sent! Waiting for confirmation...");
      const receipt = await tx.wait();
      setMessage(`Fee paid successfully! Tx Hash: ${receipt.hash}`);

      // Update fee status after payment
      const hasPaid = await feePaymentNFT.verifyFeePaid(account);
      setFeeStatus(hasPaid);
    } catch (error) {
      console.error("Error paying fee:", error);
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Fee Payment DApp</h1>

      {/* Connect Wallet */}
      <button onClick={connectWallet}>Connect Wallet</button>
      {account && <p>Connected: {account}</p>}

      {/* IdentityNFT Info */}
      {nftData ? (
        <div style={{ marginTop: "20px" }}>
          <h3>Your Identity NFT</h3>
          <p>Token ID: {nftData.tokenId}</p>
          <p>URI: {nftData.uri}</p>
          <p>Role: {nftData.role}</p>
          <p>Active: {nftData.isActive.toString()}</p>
        </div>
      ) : (
        account && <p>No Identity NFT found for this account.</p>
      )}

      {/* Fee Payment Form */}
      {account && (
        <div style={{ marginTop: "20px" }}>
          <h3>Pay Semester Fee</h3>
          <input
            type="text"
            placeholder="Semester (e.g., Spring 2025)"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            style={{ display: "block", margin: "10px 0", width: "100%" }}
          />
          <input
            type="text"
            placeholder="Metadata URI (e.g., ipfs://Qm...)"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            style={{ display: "block", margin: "10px 0", width: "100%" }}
          />
          <input
            type="number"
            placeholder="Fee Amount (ETH)"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            step="0.01"
            style={{ display: "block", margin: "10px 0", width: "100%" }}
          />
          <button onClick={payFee}>Pay Fee</button>
        </div>
      )}

      {/* Fee Status */}
      {account && feeStatus !== null && (
        <p style={{ marginTop: "10px" }}>
          Fee Paid Status: {feeStatus ? "Yes" : "No"}
        </p>
      )}

      {/* Status Message */}
      {message && <p style={{ marginTop: "10px", color: message.includes("Error") ? "red" : "green" }}>{message}</p>}
    </div>
  );
}

export default App;