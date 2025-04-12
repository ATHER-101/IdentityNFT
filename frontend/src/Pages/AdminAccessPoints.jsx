import { useState, useEffect } from "react";
import { ethers } from "ethers";
import RewardNFTArtifact from "../ABI/RewardNFT.json";

const rewardNFTAddress = "0x0106d429EE11e088a1529C51003615d443f8c45d"; // Replace with actual address
const RewardNFTABI = RewardNFTArtifact.abi;

function AdminAccessPoints() {
  const [accessPoints, setAccessPoints] = useState([]);
  const [newLocation, setNewLocation] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [newCost, setNewCost] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState(""); // Local state for displaying messages

  // Function to display messages and auto-clear after 5 seconds
  const displayMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => {
      setMessage("");
    }, 5000); // Clear after 5 seconds
  };

  // Fetch access points from the contract
  const fetchAccessPoints = async () => {
    setFetching(true);
    try {
      if (!window.ethereum) {
        displayMessage("Please install MetaMask.");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const rewardNFT = new ethers.Contract(rewardNFTAddress, RewardNFTABI, provider);

      const knownLocations = ["Mess", "Gymkhana", "Library"]; // Replace with actual logic
      const points = [];
      for (const location of knownLocations) {
        const point = await rewardNFT.accessPoints(location);
        if (point.active || point.account !== ethers.ZeroAddress) {
          points.push({
            location: point.location,
            account: point.account,
            cost: Number(point.cost),
            active: point.active,
          });
        }
      }
      setAccessPoints(points);
      if (points.length === 0) {
        displayMessage("No active access points found.");
      }
    } catch (error) {
      console.error("Error fetching access points:", error);
      displayMessage(`Error fetching access points: ${error.message}`);
    } finally {
      setFetching(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchAccessPoints();
  }, []);

  const handleAccessPointSubmit = async () => {
    if (!newLocation || !ethers.isAddress(newAccount) || !newCost || Number(newCost) <= 0) {
      displayMessage("Please fill all fields correctly (valid address, cost > 0).");
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const rewardNFT = new ethers.Contract(rewardNFTAddress, RewardNFTABI, signer);

      const exists = accessPoints.some((point) => point.location === newLocation);

      let tx;
      if (exists && isEditing) {
        tx = await rewardNFT.updateAccessPoint(newLocation, newAccount, newCost);
        await tx.wait();
        displayMessage(`Access point ${newLocation} updated successfully!`);
      } else if (!exists) {
        tx = await rewardNFT.addAccessPoint(newLocation, newAccount, newCost);
        await tx.wait();
        displayMessage(`Access point ${newLocation} added successfully!`);
      } else {
        displayMessage("Cannot add existing location. Use update instead.");
        return;
      }

      setNewLocation("");
      setNewAccount("");
      setNewCost("");
      setIsEditing(false);
      await fetchAccessPoints();
    } catch (error) {
      console.error("Error submitting access point:", error);
      displayMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClick = (accessPoint) => {
    setNewLocation(accessPoint.location);
    setNewAccount(accessPoint.account);
    setNewCost(accessPoint.cost.toString());
    setIsEditing(true);
    displayMessage(`Editing access point: ${accessPoint.location}`);
  };

  const handleDeactivate = async (location) => {
    if (!window.confirm(`Are you sure you want to deactivate ${location}?`)) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const rewardNFT = new ethers.Contract(rewardNFTAddress, RewardNFTABI, signer);

      const tx = await rewardNFT.deactivateAccessPoint(location);
      await tx.wait();
      displayMessage(`Access point ${location} deactivated successfully!`);
      await fetchAccessPoints();
    } catch (error) {
      console.error("Error deactivating access point:", error);
      displayMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-700 pt-6">
      <h3 className="text-xl font-bold mb-2 text-white">Admin: Manage Access Points</h3>

      {/* List All Access Points */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-300 mb-2">Current Access Points</h4>
        {fetching ? (
          <p className="text-gray-400">Loading access points...</p>
        ) : Array.isArray(accessPoints) && accessPoints.length > 0 ? (
          <div className="space-y-4">
            {accessPoints.map((point) => (
              <div
                key={point.location}
                className="border border-gray-700 p-4 rounded bg-gray-900"
              >
                <p className="font-semibold">Location: {point.location}</p>
                <p>Account: {point.account}</p>
                <p>Cost: {point.cost} RewardNFTs</p>
                <p>Active: {point.active ? "Yes" : "No"}</p>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleUpdateClick(point)}
                    className="bg-blue-600 px-4 py-1 rounded text-white hover:bg-blue-700"
                    disabled={loading}
                  >
                    Update
                  </button>
                  {point.active && (
                    <button
                      onClick={() => handleDeactivate(point.location)}
                      className="bg-red-600 px-4 py-1 rounded text-white hover:bg-red-700"
                      disabled={loading}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No active access points found.</p>
        )}
      </div>

      {/* Add/Update Access Point */}
      <div className="space-y-4 mb-6">
        <h4 className="text-lg font-semibold text-gray-300">
          {isEditing ? "Update Access Point" : "Add New Access Point"}
        </h4>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="e.g., Mess"
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
            disabled={isEditing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Access Point Account
          </label>
          <input
            type="text"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            placeholder="Enter account address (0x...)"
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Cost (RewardNFTs)
          </label>
          <input
            type="number"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            placeholder="e.g., 2"
            min="1"
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </div>
        <button
          onClick={handleAccessPointSubmit}
          disabled={loading}
          className={`w-full py-2 rounded text-white ${
            loading ? "bg-gray-600 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {loading
            ? isEditing
              ? "Updating..."
              : "Adding..."
            : isEditing
            ? "Update Access Point"
            : "Add Access Point"}
        </button>
        {isEditing && (
          <button
            onClick={() => {
              setNewLocation("");
              setNewAccount("");
              setNewCost("");
              setIsEditing(false);
              displayMessage("Update cancelled.");
            }}
            className="w-full py-2 rounded bg-gray-600 text-white hover:bg-gray-700"
          >
            Cancel Update
          </button>
        )}
      </div>

      {/* Message Display Area */}
      <div className="mt-4">
        {message && (
          <div
            className={`rounded ${
              message.includes("Error") || message.includes("Please")
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAccessPoints;