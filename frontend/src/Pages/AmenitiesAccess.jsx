import { useState, useEffect } from "react";
import { ethers } from "ethers";
import IdentityNFTArtifact from "../ABI/IdentityNFT.json";
import FeePaymentNFTArtifact from "../ABI/FeePaymentNFT.json";
import RewardNFTArtifact from "../ABI/RewardNFT.json";

const identityNFTAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA";
const feePaymentNFTAddress = "0xCc72ffDf6fdD0DEe66a39e5b9BE0cb9a4699AE0B";
const rewardNFTAddress = "0x0106d429EE11e088a1529C51003615d443f8c45d";
const IdentityNFTABI = IdentityNFTArtifact.abi;
const FeePaymentNFTABI = FeePaymentNFTArtifact.abi;
const RewardNFTABI = RewardNFTArtifact.abi;

function AmenitiesAccess() {
  const [studentAddress, setStudentAddress] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [amenity, setAmenity] = useState("");
  const [amenities, setAmenities] = useState([]);
  const [rewardBalance, setRewardBalance] = useState(null);
  const [amenityCost, setAmenityCost] = useState(null);
  const [showRewardOption, setShowRewardOption] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState("");
  const [isAccessPoint, setIsAccessPoint] = useState(false);

  const possibleLocations = ["Mess", "Gymkhana", "Library", "Pool", "Lab"];

  const fetchIPFSMetadata = async (uri) => {
    const ipfsHash = uri.replace("ipfs://", "");
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch IPFS metadata");
    return await response.json();
  };

  // Fetch connected account
  const fetchConnectedAccount = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      setConnectedAccount(account);
    } catch (error) {
      console.error("Error fetching connected account:", error);
      setAccessMessage("Please connect to MetaMask.");
    }
  };

  // Fetch active access points and check if connected account is an access point
  const fetchActiveAccessPoints = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const rewardNFT = new ethers.Contract(rewardNFTAddress, RewardNFTABI, provider);

      const activeAmenities = [];
      for (const location of possibleLocations) {
        const accessPoint = await rewardNFT.accessPoints(location);
        if (accessPoint.active) {
          activeAmenities.push({
            location,
            account: accessPoint.account,
            cost: Number(accessPoint.cost),
          });
        }
      }

      setAmenities(activeAmenities);
      if (activeAmenities.length > 0) {
        setAmenity(activeAmenities[0].location);
        setAmenityCost(activeAmenities[0].cost);
        // Check if connected account is the access point for the default amenity
        if (connectedAccount && activeAmenities[0].account.toLowerCase() === connectedAccount.toLowerCase()) {
          setIsAccessPoint(true);
        } else {
          setIsAccessPoint(false);
        }
      } else {
        setAmenity("");
        setIsAccessPoint(false);
      }
    } catch (error) {
      console.error("Error fetching access points:", error);
      setAccessMessage("Error: Could not fetch available amenities.");
    }
  };

  // Handle MetaMask account changes
  useEffect(() => {
    fetchConnectedAccount();
    fetchActiveAccessPoints();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        fetchConnectedAccount();
        fetchActiveAccessPoints();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, []);

  // Update isAccessPoint when amenity changes
  useEffect(() => {
    if (amenity && connectedAccount) {
      const selectedAmenity = amenities.find((a) => a.location === amenity);
      if (selectedAmenity && selectedAmenity.account.toLowerCase() === connectedAccount.toLowerCase()) {
        setIsAccessPoint(true);
        setAmenityCost(selectedAmenity.cost);
      } else {
        setIsAccessPoint(false);
        setAmenityCost(selectedAmenity ? selectedAmenity.cost : null);
      }
    }
  }, [amenity, connectedAccount, amenities]);

  const checkAccess = async () => {
    if (!ethers.isAddress(studentAddress)) {
      setAccessMessage("Please enter a valid Ethereum address.");
      return;
    }

    if (!amenity) {
      setAccessMessage("No amenities available or none selected.");
      return;
    }

    if (!connectedAccount) {
      setAccessMessage("Please connect to MetaMask.");
      return;
    }

    if (!isAccessPoint) {
      setAccessMessage("Connected account is not the access point for this amenity.");
      return;
    }

    setLoading(true);
    setAccessMessage("");
    setShowRewardOption(false);
    setRewardBalance(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

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
        // No active FeePaymentNFT, check RewardNFT balance
        const rewardNFT = new ethers.Contract(rewardNFTAddress, RewardNFTABI, provider);
        const balance = await rewardNFT.balanceOf(studentAddress);
        const rewardBalanceNum = Number(balance);
        setRewardBalance(rewardBalanceNum);

        if (rewardBalanceNum >= amenityCost) {
          setShowRewardOption(true);
          setAccessMessage(
            `Access Denied: ${amenity} fee not paid. You have ${rewardBalanceNum} RewardNFT(s). The cost is ${amenityCost} RewardNFT(s).`
          );
        } else {
          setAccessMessage(
            `Access Denied: ${amenity} fee not paid. You have ${rewardBalanceNum} RewardNFT(s), but need ${amenityCost} to access.`
          );
        }
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
        // Fee not paid, check RewardNFT balance
        const rewardNFT = new ethers.Contract(rewardNFTAddress, RewardNFTABI, provider);
        const balance = await rewardNFT.balanceOf(studentAddress);
        const rewardBalanceNum = Number(balance);
        setRewardBalance(rewardBalanceNum);

        if (rewardBalanceNum >= amenityCost) {
          setShowRewardOption(true);
          setAccessMessage(
            `Access Denied: ${amenity} fee not paid. You have ${rewardBalanceNum} RewardNFT(s). The cost is ${amenityCost} RewardNFT(s).`
          );
        } else {
          setAccessMessage(
            `Access Denied: ${amenity} fee not paid. You have ${rewardBalanceNum} RewardNFT(s), but need ${amenityCost} to access.`
          );
        }
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

  const useRewardNFTs = async () => {
    if (!isAccessPoint) {
      setAccessMessage("Connected account is not the access point for this amenity.");
      return;
    }

    setLoading(true);
    setAccessMessage("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const rewardNFT = new ethers.Contract(rewardNFTAddress, RewardNFTABI, signer);

      // Call requestAccess
      const tx = await rewardNFT.requestAccess(amenity, studentAddress);
      await tx.wait();

      setAccessMessage(`Access Granted: Used ${amenityCost} RewardNFT(s) for ${amenity}.`);
      setShowRewardOption(false);
      setRewardBalance(null);
    } catch (error) {
      console.error("Error using RewardNFTs:", error);
      setAccessMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">Amenities Access Check</h1>

      <div className="space-y-4">
        {/* Connected Account Display */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Connected Account
          </label>
          <input
            type="text"
            value={connectedAccount || "Not connected"}
            readOnly
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </div>

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
            disabled={amenities.length === 0}
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          >
            {amenities.length === 0 ? (
              <option value="">No amenities available</option>
            ) : (
              amenities.map((item) => (
                <option key={item.location} value={item.location}>
                  {item.location}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Check Access Button */}
        <button
          onClick={checkAccess}
          disabled={loading || !studentAddress || !amenity || !isAccessPoint}
          className={`w-full py-2 rounded text-white transition ${
            loading || !studentAddress || !amenity || !isAccessPoint
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Checking..." : "Check Access"}
        </button>

        {/* Use RewardNFT Button */}
        {showRewardOption && (
          <button
            onClick={useRewardNFTs}
            disabled={loading || !isAccessPoint}
            className={`w-full py-2 rounded text-white transition ${
              loading || !isAccessPoint
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Processing..." : `Use ${amenityCost} RewardNFT(s) to Access`}
          </button>
        )}

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