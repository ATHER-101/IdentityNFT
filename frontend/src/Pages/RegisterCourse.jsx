import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CourseRegistrationABI from "../ABI/CourseRegistration.json";

const courseRegistrationAddress = "0x616fDf716b04A002F6B2A84DcC043DD17adE7bB6";
const registrationABI = CourseRegistrationABI.abi;

const PINATA_API_KEY = "5456470e28a86bec2f53";
const PINATA_SECRET_KEY = "12f1dc08af32705a2af594d2d15723452cdc57e4a765a8664eb6e563f33c3819";
const PLACEHOLDER_IMAGE = "ipfs://bafybeiehhh5322h2khbjjp2huqlyejduotpzcixpnrzv2juo5s7gltzbge";

function RegisterCourse({nftData}) {
  const [account, setAccount] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      const fetchCourses = async () => {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(courseRegistrationAddress, registrationABI, provider);
        const allCourses = await contract.getAllCourses();
        const activeCourses = allCourses.filter(course => course.active);
        setCourses(activeCourses);
      };

      window.ethereum.request({ method: "eth_requestAccounts" }).then((accounts) => {
        setAccount(accounts[0]);
        fetchCourses();
      });
    }
  }, []);

  const pinMetadataToIPFS = async (course) => {
    setMessage("Generating metadata...");
    const metadata = {
      name: course.courseName,
      description: `Currently registered for ${course.courseName}`,
      image: PLACEHOLDER_IMAGE,
      attributes: [
        { trait_type: "Course Name", value: course.courseName },
        { trait_type: "Student Name", value: nftData.name },
        { trait_type: "Instructor", value: course.instructor },
        { trait_type: "Duration", value: course.duration.toString() },
        { trait_type: "Credits", value: course.credits.toString() }
      ],
    };

    setMessage("Uploading metadata to IPFS...");

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) throw new Error("Failed to upload metadata to Pinata");

    const res = await response.json();
    setMessage("Metadata uploaded successfully.");
    return `ipfs://${res.IpfsHash}`;
  };

  const handleRegister = async () => {
    if (!selectedCourseId) {
      setMessage("Please select a course.");
      return;
    }

    try {
      const course = courses.find((c) => c.courseId.toString() === selectedCourseId);

      const metadataURI = await pinMetadataToIPFS(course);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(courseRegistrationAddress, registrationABI, signer);

      setMessage("Sending registration transaction...");
      const tx = await contract.register(course.courseId, metadataURI);
      await tx.wait();

      setMessage("✅ Successfully registered for the course!");
    } catch (err) {
      console.error(err);
      setMessage("❌ Registration failed: " + err.message);
    }
  };

  return (
    <div className="max-w-xl p-4 bg-gray-900 text-white rounded shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">📘 Course Registration</h2>
      <p className="mb-2 text-sm">Connected wallet: <span className="text-blue-400">{account || "Not connected"}</span></p>

      <select
        value={selectedCourseId}
        onChange={(e) => setSelectedCourseId(e.target.value)}
        className="w-full mb-4 p-2 rounded bg-gray-800 border border-gray-700"
      >
        <option value="">Select a course</option>
        {courses.map((course) => (
          <option key={course.courseId} value={course.courseId}>
            {course.courseName}
          </option>
        ))}
      </select>

      {selectedCourseId && (() => {
        const course = courses.find((c) => c.courseId.toString() === selectedCourseId);
        return course ? (
          <div className="mb-4 p-3 rounded bg-gray-800 border border-gray-700">
            <p><strong>Course Name:</strong> {course.courseName}</p>
            <p><strong>Instructor:</strong> {course.instructor}</p>
            <p><strong>Duration:</strong> {course.duration} weeks</p>
            <p><strong>Credits:</strong> {course.credits}</p>
            <p><strong>Status:</strong> {course.active ? "Active" : "Inactive"}</p>
          </div>
        ) : null;
      })()}

      <button
        onClick={handleRegister}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Register
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.includes("failed") ? "text-red-500" : "text-green-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default RegisterCourse;