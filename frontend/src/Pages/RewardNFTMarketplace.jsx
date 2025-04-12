import { useState, useEffect } from "react";
import { ethers } from "ethers";
import RewardNFTMarketplaceArtifact from "../ABI/RewardNFTMarketplace.json";
import RewardNFTArtifact from "../ABI/RewardNFT.json";
import IdentityNFTArtifact from "../ABI/IdentityNFT.json";

const marketplaceAddress = "0xF4b3067206e9d74a886154501A47B8423b7efF27";
const rewardNFTAddress = "0x8892d39863598A1E79FDEb33F0047358F9C50784";
const identityNFTAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA";

const marketplaceABI = RewardNFTMarketplaceArtifact.abi;
const rewardNFTABI = RewardNFTArtifact.abi;
const identityNFTABI = IdentityNFTArtifact.abi;

export default function RewardNFTMarketplace() {
  const [account, setAccount] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [rewardNFT, setRewardNFT] = useState(null);
  const [nftPrice, setNftPrice] = useState("0");
  const [ownedBalance, setOwnedBalance] = useState(0);
  const [listedNFTs, setListedNFTs] = useState([]);
  const [userListedNFTs, setUserListedNFTs] = useState([]); // New state for user's listed NFTs
  const [tokenIdToList, setTokenIdToList] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        showMessage("Please install MetaMask!", "error");
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);

        const marketplaceContract = new ethers.Contract(marketplaceAddress, marketplaceABI, signer);
        const rewardNFTContract = new ethers.Contract(rewardNFTAddress, rewardNFTABI, signer);

        setMarketplace(marketplaceContract);
        setRewardNFT(rewardNFTContract);

        const price = await marketplaceContract.nftPrice();
        setNftPrice(ethers.formatEther(price));

        const owner = await marketplaceContract.owner();
        setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
        console.log("Contract owner:", owner, "Connected account:", accounts[0]);

        await fetchOwnedBalance(rewardNFTContract, accounts[0]);
        await fetchListedNFTs(marketplaceContract, rewardNFTContract);
        await fetchUserListedNFTs(marketplaceContract, rewardNFTContract, accounts[0]);
      } catch (err) {
        console.error("Initialization error:", err);
        showMessage("Failed to initialize: " + err.message, "error");
      }
    };
    init();
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const fetchOwnedBalance = async (contractInstance, owner) => {
    try {
      const balance = await contractInstance.balanceOf(owner);
      setOwnedBalance(Number(balance));
      console.log(`Owned NFT balance for ${owner}: ${balance}`);
    } catch (err) {
      console.error("Error fetching owned balance:", err);
      showMessage("Failed to load owned NFT balance: " + err.message, "error");
    }
  };

  const fetchListedNFTs = async (marketplaceInstance, rewardNFTInstance) => {
    try {
      const totalSupply = await rewardNFTInstance.getCurrentTokenId();
      const listings = [];
      for (let i = 1; i <= Number(totalSupply); i++) {
        const seller = await marketplaceInstance.tokenSeller(i);
        if (seller !== ethers.ZeroAddress) {
          listings.push({ tokenId: i.toString(), seller });
        }
      }
      setListedNFTs(listings);
      console.log("Listed NFTs:", listings);
    } catch (err) {
      console.error("Error fetching listed NFTs:", err);
      showMessage("Failed to load listed NFTs: " + err.message, "error");
    }
  };

  const fetchUserListedNFTs = async (marketplaceInstance, rewardNFTInstance, userAddress) => {
    try {
      const totalSupply = await rewardNFTInstance.getCurrentTokenId();
      const userListings = [];
      for (let i = 1; i <= Number(totalSupply); i++) {
        const seller = await marketplaceInstance.tokenSeller(i);
        if (seller.toLowerCase() === userAddress.toLowerCase()) {
          userListings.push({ tokenId: i.toString(), seller });
        }
      }
      setUserListedNFTs(userListings);
      console.log("User's Listed NFTs:", userListings);
    } catch (err) {
      console.error("Error fetching user's listed NFTs:", err);
      showMessage("Failed to load your listed NFTs: " + err.message, "error");
    }
  };

  const setNFTPriceHandler = async () => {
    if (!newPrice || isNaN(newPrice) || Number(newPrice) <= 0) {
      showMessage("Please enter a valid price greater than 0", "error");
      return;
    }

    try {
      showMessage("Setting NFT price...");
      const tx = await marketplace.setNFTPrice(ethers.parseEther(newPrice));
      await tx.wait();

      const updatedPrice = await marketplace.nftPrice();
      setNftPrice(ethers.formatEther(updatedPrice));
      setNewPrice("");
      showMessage("NFT price set successfully!");
    } catch (err) {
      console.error("Error setting NFT price:", err);
      showMessage("Failed to set NFT price: " + err.message, "error");
    }
  };

  const listNFT = async () => {
    if (!tokenIdToList) {
      showMessage("Please enter a Token ID", "error");
      return;
    }

    try {
      showMessage("Listing NFT...");
      const listTx = await marketplace.listNFT(tokenIdToList);
      await listTx.wait();

      showMessage("NFT listed successfully!");
      setTokenIdToList("");
      await fetchOwnedBalance(rewardNFT, account);
      await fetchListedNFTs(marketplace, rewardNFT);
      await fetchUserListedNFTs(marketplace, rewardNFT, account);
    } catch (err) {
      console.error("Error listing NFT:", err);
      if (err.message.includes("Marketplace not approved")) {
        setShowApprovalModal(true);
      } else if (err.message.includes("NFT already listed")) {
        showMessage("This NFT is already listed!", "error");
      } else {
        showMessage("Failed to list NFT: " + err.message, "error");
      }
    }
  };

  const handleApproval = async (approveAll) => {
    setShowApprovalModal(false);
    try {
      if (approveAll) {
        showMessage("Approving marketplace for all tokens...");
        const approveAllTx = await rewardNFT.setApprovalForAll(marketplaceAddress, true);
        await approveAllTx.wait();
        showMessage("Marketplace approved for all tokens!");
      } else {
        showMessage("Approving marketplace for this token...");
        const approveTx = await rewardNFT.approve(marketplaceAddress, tokenIdToList);
        await approveTx.wait();
        showMessage("Marketplace approved for this token!");
      }

      showMessage("Retrying listing NFT...");
      const retryTx = await marketplace.listNFT(tokenIdToList);
      await retryTx.wait();

      showMessage("NFT listed successfully!");
      setTokenIdToList("");
      await fetchOwnedBalance(rewardNFT, account);
      await fetchListedNFTs(marketplace, rewardNFT);
      await fetchUserListedNFTs(marketplace, rewardNFT, account);
    } catch (approvalErr) {
      console.error("Error during approval:", approvalErr);
      showMessage("Failed to approve marketplace: " + approvalErr.message, "error");
    }
  };

  const unlistNFT = async (tokenId) => {
    try {
      showMessage("Unlisting NFT...");
      const tx = await marketplace.unlistNFT(tokenId);
      await tx.wait();

      showMessage("NFT unlisted successfully!");
      await fetchOwnedBalance(rewardNFT, account);
      await fetchListedNFTs(marketplace, rewardNFT);
      await fetchUserListedNFTs(marketplace, rewardNFT, account);
    } catch (err) {
      console.error("Error unlisting NFT:", err);
      showMessage("Failed to unlist NFT: " + err.message, "error");
    }
  };

  const buyNFT = async (tokenId) => {
    try {
      showMessage("Buying NFT...");
      const tx = await marketplace.buyNFT(tokenId, { value: ethers.parseEther(nftPrice) });
      await tx.wait();

      showMessage("NFT bought successfully!");
      await fetchOwnedBalance(rewardNFT, account);
      await fetchListedNFTs(marketplace, rewardNFT);
      await fetchUserListedNFTs(marketplace, rewardNFT, account);
    } catch (err) {
      console.error("Error buying NFT:", err);
      showMessage("Failed to buy NFT: " + err.message, "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto text-white p-6">
      <h1 className="text-3xl font-bold mb-4">Reward NFT Marketplace</h1>
      <p className="mb-4 text-sm">Connected: {account || "Not connected"}</p>
      <p className="mb-4 text-sm">NFT Price: {nftPrice} ETH</p>
      <p className="mb-4 text-sm">Your Owned NFTs: {ownedBalance}</p>

      {isOwner && (
        <div className="border-t border-gray-700 pt-6 mb-6">
          <h3 className="text-xl font-bold mb-2">Admin: Set NFT Price</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="number"
              step="0.001"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Enter new price in ETH"
              className="p-2 rounded bg-gray-800 border border-gray-600"
            />
            <button
              onClick={setNFTPriceHandler}
              className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700"
            >
              Set Price
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-gray-700 pt-6 mb-6">
        <h3 className="text-xl font-bold mb-2">List Your NFT</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            type="number"
            value={tokenIdToList}
            onChange={(e) => setTokenIdToList(e.target.value)}
            placeholder="Enter Token ID to list"
            className="p-2 rounded bg-gray-800 border border-gray-600"
          />
          <button
            onClick={listNFT}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            List NFT
          </button>
        </div>
        <p className="text-sm text-gray-400">
          Note: Enter the Token ID of an NFT you own. Check your wallet or Course Dashboard for IDs.
        </p>
      </div>

      {/* User's Listed NFTs */}
      <div className="border-t border-gray-700 pt-6 mb-6">
        <h3 className="text-xl font-bold mb-2">Your Listed NFTs</h3>
        {userListedNFTs.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {userListedNFTs.map((nft) => (
              <div key={nft.tokenId} className="border border-gray-700 p-4 rounded bg-gray-900">
                <p className="font-semibold">Token ID: {nft.tokenId}</p>
                <p>Price: {nftPrice} ETH</p>
                <button
                  onClick={() => unlistNFT(nft.tokenId)}
                  className="text-red-400 hover:underline mt-2"
                >
                  Unlist
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>You have no NFTs listed for sale.</p>
        )}
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-xl font-bold mb-2">Listed NFTs for Sale</h3>
        {listedNFTs.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {listedNFTs.map((nft) => (
              <div key={nft.tokenId} className="border border-gray-700 p-4 rounded bg-gray-900">
                <p className="font-semibold">Token ID: {nft.tokenId}</p>
                <p>Seller: {nft.seller}</p>
                <p>Price: {nftPrice} ETH</p>
                {nft.seller === account ? (
                  <button
                    onClick={() => unlistNFT(nft.tokenId)}
                    className="text-red-400 hover:underline mt-2"
                  >
                    Unlist
                  </button>
                ) : (
                  <button
                    onClick={() => buyNFT(nft.tokenId)}
                    className="text-green-400 hover:underline mt-2"
                  >
                    Buy
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No NFTs listed for sale.</p>
        )}
      </div>

      {showApprovalModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Approval Required</h3>
            <p className="text-sm mb-4">
              The marketplace needs approval to transfer your NFT (Token ID: {tokenIdToList}).
              Choose an option:
            </p>
            <div className="flex justify-between">
              <button
                onClick={() => handleApproval(false)}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Approve This NFT
              </button>
              <button
                onClick={() => handleApproval(true)}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Approve All NFTs
              </button>
            </div>
            <button
              onClick={() => setShowApprovalModal(false)}
              className="mt-4 text-gray-400 hover:underline w-full text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message.text && (
        <p
          className={`mt-4 text-sm ${
            message.type === "error" ? "text-red-400" : "text-green-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}