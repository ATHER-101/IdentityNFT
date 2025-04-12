import { useState } from "react";
import { ethers } from "ethers";
import IdentityNFTArtifact from "../ABI/IdentityNFT.json";
import FeePaymentNFTArtifact from "../ABI/FeePaymentNFT.json";

const identityNFTAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA";
const feePaymentNFTAddress = "0xCc72ffDf6fdD0DEe66a39e5b9BE0cb9a4699AE0B";
const IdentityNFTABI = IdentityNFTArtifact.abi;
const FeePaymentNFTABI = FeePaymentNFTArtifact.abi;

function AmenitiesAccess() {
  const [studentAddress, setStudentAddress] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [amenity, setAmenity] = useState("Gymkhana"); // Default amenity

  const fetchIPFSMetadata = async (uri) => {
    const ipfsHash = uri.replace("ipfs://", "");
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch IPFS metadata");
    return await response.json();
  };

  const checkAccess = async () => {
    if (!ethers.isAddress(studentAddress)) {
      setAccessMessage("Please enter a valid Ethereum address.");
      return;
    }

    setLoading(true);
    setAccessMessage("");

    try {
      // Use a public Sepolia RPC (replace with your Infura/Alchemy key for production)
    //   const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_KEY");
      const provider = new ethers.BrowserProvider(window.ethereum); // Uncomment for MetaMask

      // Check IdentityNFT
      const identityNFT = new ethers.Contract(identityNFTAddress, IdentityNFTABI, provider);
      const identityBalance = await identityNFT.balanceOf(studentAddress);

      if (Number(identityBalance) === 0) {
        setAccessMessage("Access Denied: Student does not own an IdentityNFT.");
        setLoading(false);
        return;
      }

      // Check FeePaymentNFT
      const feePaymentNFT = new ethers.Contract(feePaymentNFTAddress, FeePaymentNFTABI, provider);
      const activeTokenId = await feePaymentNFT.activeFeeNFT(studentAddress);

      if (activeTokenId === 0n) {
        setAccessMessage("Access Denied: Student has not paid fees (no active FeePaymentNFT).");
        setLoading(false);
        return;
      }

      // Fetch FeePaymentNFT metadata
      const uri = await feePaymentNFT.tokenURI(activeTokenId);
      const metadata = await fetchIPFSMetadata(uri);

      // Check if the selected amenity fee is paid
      const feeAttribute = metadata.attributes.find(
        (attr) => attr.trait_type.toLowerCase() === amenity.toLowerCase()
      );

      if (!feeAttribute || feeAttribute.value === "0") {
        setAccessMessage(`Access Denied: ${amenity} fee not paid.`);
      } else {
        setAccessMessage(`Access Granted: ${amenity} fee paid (${feeAttribute.value} ETH).`);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setAccessMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">Amenities Access Check</h1>

      <div className="space-y-4">
        {/* Student Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Student Address
          </label>
          <input
            type="text"
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
            placeholder="Enter student Ethereum address (0x...)"
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Amenity Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Select Amenity
          </label>
          <select
            value={amenity}
            onChange={(e) => setAmenity(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Mess">Mess</option>
            <option value="Gymkhana">Gymkhana</option>
            <option value="Library">Library</option>
          </select>
        </div>

        {/* Check Access Button */}
        <button
          onClick={checkAccess}
          disabled={loading || !studentAddress}
          className={`w-full py-2 rounded text-white transition ${
            loading || !studentAddress
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Checking..." : "Check Access"}
        </button>

        {/* Result Message */}
        {accessMessage && (
          <p
            className={`mt-4 text-center text-sm ${
              accessMessage.includes("Granted")
                ? "text-green-400"
                : accessMessage.includes("Denied")
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {accessMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export default AmenitiesAccess;