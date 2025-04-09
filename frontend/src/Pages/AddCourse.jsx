import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CourseRegistrationArtifact from "../ABI/CourseRegistration.json";

const courseRegistrationAddress = "0x325b2c5754b84769C2b5bb7966CeA24d24089e2F"; // Replace with actual deployed address
const CourseRegistrationABI = CourseRegistrationArtifact.abi;

function AddCourse() {
  const [account, setAccount] = useState(null);
  const [courseName, setCourseName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [duration, setDuration] = useState("");
  const [credits, setCredits] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts.length) setAccount(accounts[0]);
      });
    }
  }, []);

  const addCourse = async () => {
    if (!account) return setMessage("Connect your wallet first!");
    if (!courseName || !instructor || !duration || !credits) {
      return setMessage("Please fill all fields.");
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(courseRegistrationAddress, CourseRegistrationABI, signer);

      setMessage("Submitting transaction...");
      const tx = await contract.addCourse(courseName, instructor, Number(duration), Number(credits));
      await tx.wait();

      setMessage("Course added successfully!");

      // Reset form
      setCourseName("");
      setInstructor("");
      setDuration("");
      setCredits("");
    } catch (err) {
      console.error(err);
      setMessage("Error adding course: " + err.message);
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold mb-4">Add a New Course</h2>
      <p className="mb-2 text-sm">Connected: {account || "Not Connected"}</p>

      <input
        type="text"
        value={courseName}
        onChange={(e) => setCourseName(e.target.value)}
        placeholder="Course Name"
        className="w-full p-2 mb-3 rounded bg-gray-800 text-white border border-gray-700"
      />

      <input
        type="text"
        value={instructor}
        onChange={(e) => setInstructor(e.target.value)}
        placeholder="Instructor Name"
        className="w-full p-2 mb-3 rounded bg-gray-800 text-white border border-gray-700"
      />

      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Duration (weeks)"
        className="w-full p-2 mb-3 rounded bg-gray-800 text-white border border-gray-700"
      />

      <input
        type="number"
        value={credits}
        onChange={(e) => setCredits(e.target.value)}
        placeholder="Credits"
        className="w-full p-2 mb-4 rounded bg-gray-800 text-white border border-gray-700"
      />

      <button
        onClick={addCourse}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Add Course
      </button>

      {message && (
        <p className={`mt-3 text-sm ${message.toLowerCase().includes("error") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default AddCourse;