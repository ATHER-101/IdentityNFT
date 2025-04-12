import { useEffect, useState } from "react";
import { ethers } from "ethers";
import FeePaymentNFTArtifact from "../ABI/FeePaymentNFT.json";

const feePaymentNFTAddress = "0xCc72ffDf6fdD0DEe66a39e5b9BE0cb9a4699AE0B";
const FeePaymentNFTABI = FeePaymentNFTArtifact.abi;

const PINATA_API_KEY = "5456470e28a86bec2f53";
const PINATA_SECRET_KEY = "12f1dc08af32705a2af594d2d15723452cdc57e4a765a8664eb6e563f33c3819";

function FeePayment({nftData}) {
  const [account, setAccount] = useState(null);
  const [semester, setSemester] = useState("");
  const [fees, setFees] = useState({
    tuition: true,
    hostel: true,
    mess: false,
    gymkhana: false,
    library: false,
  });
  const [message, setMessage] = useState("");
  const [feeStatus, setFeeStatus] = useState(null);

  const feeAmounts = {
    tuition: ethers.parseEther("0.001"),
    hostel: ethers.parseEther("0.0002"),
    mess: ethers.parseEther("0.002"),
    gymkhana: ethers.parseEther("0.0002"),
    library: ethers.parseEther("0.0004"),
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts.length) setAccount(accounts[0]);
      });
    }
  }, []);

  const calculateTotalFee = () => {
    const totalWei = Object.keys(fees).reduce((sum, key) => {
      return fees[key] ? sum + BigInt(feeAmounts[key]) : sum;
    }, 0n);
    return ethers.formatEther(totalWei);
  };

  const pinJSONToIPFS = async (json) => {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: JSON.stringify(json),
    });
    if (!response.ok) throw new Error("Failed to upload to Pinata");
    return await response.json();
  };

  const handleFeeChange = (feeType) => {
    if (feeType === "tuition" || feeType === "hostel") return;
    setFees((prev) => ({ ...prev, [feeType]: !prev[feeType] }));
  };

  const payFee = async () => {
    if (!account) return setMessage("Connect wallet first!");
    if (!semester) return setMessage("Select a semester!");

    try {
      const metadata = {
        name: nftData.name,
        description: `Fee Payment for ${semester}`,
        image: "ipfs://bafybeiehhh5322h2khbjjp2huqlyejduotpzcixpnrzv2juo5s7gltzbge",
        attributes: Object.entries(fees).map(([key, value]) => ({
          trait_type: key.charAt(0).toUpperCase() + key.slice(1),
          value: value ? ethers.formatEther(feeAmounts[key]) : "0",
        })),
      };

      setMessage("Uploading to IPFS...");
      const pinataRes = await pinJSONToIPFS(metadata);
      const metadataURI = `ipfs://${pinataRes.IpfsHash}`;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const feeNFT = new ethers.Contract(feePaymentNFTAddress, FeePaymentNFTABI, signer);
      const totalFee = calculateTotalFee();

      const tx = await feeNFT.payFee(semester, metadataURI, {
        value: ethers.parseEther(totalFee),
      });

      setMessage("Waiting for confirmation...");
      await tx.wait();
      setMessage("Fee paid successfully!");

      const hasPaid = await feeNFT.verifyFeePaid(account);
      setFeeStatus(hasPaid);
    } catch (err) {
      console.error(err);
      setMessage("Payment failed: " + err.message);
    }
  };

  return (
      <div className="max-w-xl">
        <h2 className="text-2xl font-semibold mb-4">Fee Payment</h2>
        <p className="mb-2 text-sm">Connected: {account || "Not Connected"}</p>

        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="w-full mb-4 p-2 rounded bg-gray-800 text-white border border-gray-700"
        >
          <option value="">Select Semester</option>
          <option value="Autumn 2025">Autumn 2025</option>
          <option value="Spring 2025">Spring 2025</option>
        </select>

        <div className="mb-4 space-y-2">
          {Object.keys(fees).map((fee) => (
            <label key={fee} className="block">
              <input
                type="checkbox"
                checked={fees[fee]}
                onChange={() => handleFeeChange(fee)}
                disabled={fee === "tuition" || fee === "hostel"}
                className="mr-2 accent-blue-600"
              />
              {fee.charAt(0).toUpperCase() + fee.slice(1)} ({ethers.formatEther(feeAmounts[fee])} ETH)
            </label>
          ))}
        </div>

        <p className="mb-2">Total Fee: {calculateTotalFee()} ETH</p>

        <button
          onClick={payFee}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Pay Fee
        </button>

        {feeStatus !== null && (
          <p className="mt-3 text-sm">Fee Paid: {feeStatus ? "Yes" : "No"}</p>
        )}
        {message && (
          <p className={`mt-2 text-sm ${message.includes("failed") ? "text-red-400" : "text-green-400"}`}>
            {message}
          </p>
        )}
      </div>
  );
}

export default FeePayment;