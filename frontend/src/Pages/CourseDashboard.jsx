import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CourseRegistrationArtifact from "../ABI/CourseRegistration.json";
import IdentityNFTArtifact from "../ABI/IdentityNFT.json";

const contractAddress = "0x616fDf716b04A002F6B2A84DcC043DD17adE7bB6";
const contractABI = CourseRegistrationArtifact.abi;

const identityNFTAddress = "0x1F856ab34F5A8b46563050b7cfa8fFfba070bFFA";
const IdentityNFTABI = IdentityNFTArtifact.abi;

const PINATA_API_KEY = "5456470e28a86bec2f53";
const PINATA_SECRET_KEY = "12f1dc08af32705a2af594d2d15723452cdc57e4a765a8664eb6e563f33c3819";
const PLACEHOLDER_IMAGE = "ipfs://bafybeiehhh5322h2khbjjp2huqlyejduotpzcixpnrzv2juo5s7gltzbge";

export default function CourseDashboard({ nftData }) {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [form, setForm] = useState({ name: "", instructor: "", duration: "", credits: "" });
  const [gradeForm, setGradeForm] = useState({ student: "", courseId: "", grade: "" });
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const instance = new ethers.Contract(contractAddress, contractABI, signer);
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
        setContract(instance);
        fetchCourses(instance);
      }
    };
    init();
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const fetchCourses = async (contractInstance = contract) => {
    try {
      const data = await contractInstance.getAllCourses();
      setCourses(data);
    } catch (err) {
      console.error(err);
      showMessage("Failed to load courses", "error");
    }
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGradeInput = (e) => {
    setGradeForm({ ...gradeForm, [e.target.name]: e.target.value });
  };

  const addCourse = async () => {
    if (!form.name || !form.instructor || !form.duration || !form.credits) {
      return showMessage("Please fill in all course fields.", "error");
    }

    try {
      showMessage("Submitting transaction...");
      const tx = await contract.addCourse(
        form.name,
        form.instructor,
        Number(form.duration),
        Number(form.credits)
      );
      await tx.wait();
      showMessage("Course added successfully!");
      setForm({ name: "", instructor: "", duration: "", credits: "" });
      fetchCourses();
    } catch (err) {
      console.error(err);
      showMessage("Failed to add course: " + err.message, "error");
    }
  };

  const updateCourse = async () => {
    if (!selectedCourse) return;
    if (!form.name || !form.instructor || !form.duration || !form.credits) {
      return showMessage("Please fill in all course fields.", "error");
    }

    try {
      showMessage("Submitting update...");
      const tx = await contract.updateCourse(
        selectedCourse.courseId,
        form.name,
        form.instructor,
        Number(form.duration),
        Number(form.credits)
      );
      await tx.wait();
      showMessage("Course updated successfully!");
      fetchCourses();
      clearForm();
    } catch (err) {
      console.error(err);
      showMessage("Failed to update course: " + err.message, "error");
    }
  };

  const activate = async (courseId) => {
    try {
      showMessage("Activating...");
      const tx = await contract.activateCourse(courseId);
      await tx.wait();
      showMessage("Course activated.");
      fetchCourses();
    } catch (err) {
      console.error(err);
      showMessage("Activation failed: " + err.message, "error");
    }
  };

  const deactivate = async (courseId) => {
    try {
      showMessage("Deactivating...");
      const tx = await contract.deactivateCourse(courseId);
      await tx.wait();
      showMessage("Course deactivated.");
      fetchCourses();
    } catch (err) {
      console.error(err);
      showMessage("Deactivation failed: " + err.message, "error");
    }
  };

  const loadStudents = async (courseId) => {
    try {
      const data = await contract.getCourseStudents(courseId);
      setStudents(data);
    } catch (err) {
      console.error(err);
      showMessage("Failed to load students", "error");
    }
  };

  const getStudentName = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const identityNFT = new ethers.Contract(identityNFTAddress, IdentityNFTABI, provider);

      const tokenId = await identityNFT.tokenOfOwnerByIndex(address, 0);
      const uri = await identityNFT.tokenURI(tokenId);
      const ipfsHash = uri.replace("ipfs://", "");
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      const metadata = await response.json();

      return metadata.name;
    } catch (err) {
      console.error("Error fetching student name:", err);
      return "Unknown Student";
    }
  };

  const pinMetadataToIPFS = async (courseId, grade) => {
    const course = courses.find(c => c.courseId.toString() === courseId);
    if (!course) throw new Error("Missing course!");

    const studentName = await getStudentName(gradeForm.student); // 👈

    const metadata = {
      name: `Course Completion: ${course.courseName}`,
      description: `${studentName} completed ${course.courseName} with grade ${grade}/10`,
      image: PLACEHOLDER_IMAGE,
      attributes: [
        { trait_type: "Course", value: course.courseName },
        { trait_type: "Student", value: studentName },
        { trait_type: "Grade", value: grade.toString() },
        { trait_type: "Instructor", value: course.instructor },
        { trait_type: "Duration", value: course.duration.toString() },
        { trait_type: "Credits", value: course.credits.toString() }
      ]
    };

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) throw new Error("Failed to upload metadata");

    const result = await response.json();
    return `ipfs://${result.IpfsHash}`;
  };

  const submitGrade = async () => {
    const { student, courseId, grade } = gradeForm;
    if (!student || !courseId || !grade) {
      return showMessage("Please complete all fields for grade submission.", "error");
    }

    try {
      showMessage("Uploading metadata...");
      const metadataURI = await pinMetadataToIPFS(courseId, grade);

      showMessage("Submitting grade...");
      const tx = await contract.submitGrade(
        student,
        Number(courseId),
        Number(grade),
        metadataURI
      );
      await tx.wait();

      showMessage("Grade submitted successfully!");
      setGradeForm({ student: "", courseId: "", grade: "" });
    } catch (err) {
      console.error(err);
      showMessage("Failed to submit grade: " + err.message, "error");
    }
  };

  const clearForm = () => {
    setForm({ name: "", instructor: "", duration: "", credits: "" });
    setSelectedCourse(null);
  };

  const onSelectCourse = (course) => {
    setSelectedCourse(course);
    setForm({
      name: course.courseName,
      instructor: course.instructor,
      duration: course.duration.toString(),
      credits: course.credits.toString(),
    });
  };

  return (
    <div className="max-w-5xl mx-auto text-white p-6">
      <h1 className="text-3xl font-bold mb-4">Course Dashboard</h1>
      <p className="mb-4 text-sm">Connected: {account || "Not connected"}</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <input name="name" placeholder="Course Name" value={form.name} onChange={handleInput}
          className="p-2 rounded bg-gray-800 border border-gray-600" />
        <input name="instructor" placeholder="Instructor" value={form.instructor} onChange={handleInput}
          className="p-2 rounded bg-gray-800 border border-gray-600" />
        <input name="duration" type="number" placeholder="Duration (weeks)" value={form.duration} onChange={handleInput}
          className="p-2 rounded bg-gray-800 border border-gray-600" />
        <input name="credits" type="number" placeholder="Credits" value={form.credits} onChange={handleInput}
          className="p-2 rounded bg-gray-800 border border-gray-600" />
      </div>

      <div className="flex gap-4 mb-6">
        <button onClick={addCourse} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">Add Course</button>
        {selectedCourse && (
          <>
            <button onClick={updateCourse} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Update Selected</button>
            <button onClick={clearForm} className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700">Clear</button>
          </>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {courses.map((course) => (
          <div key={course.courseId} className="border border-gray-700 p-4 rounded bg-gray-900">
            <p className="font-semibold text-xl">{course.courseName}</p>
            <p>Instructor: {course.instructor}</p>
            <p>Duration: {course.duration} weeks</p>
            <p>Credits: {course.credits}</p>
            <p>Status: {course.active ? "Active" : "Inactive"}</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => onSelectCourse(course)} className="text-blue-400 hover:underline">Edit</button>
              <button onClick={() => loadStudents(course.courseId)} className="text-yellow-400 hover:underline">View Students</button>
              {course.active ? (
                <button onClick={() => deactivate(course.courseId)} className="text-red-400 hover:underline">Deactivate</button>
              ) : (
                <button onClick={() => activate(course.courseId)} className="text-green-400 hover:underline">Activate</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {students.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Enrolled Students</h3>
          <ul className="list-disc ml-6 space-y-1">
            {students.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-xl font-bold mb-2">Submit Grade</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input name="student" placeholder="Student Address" value={gradeForm.student} onChange={handleGradeInput}
            className="p-2 rounded bg-gray-800 border border-gray-600" />
          <input name="courseId" type="number" placeholder="Course ID" value={gradeForm.courseId} onChange={handleGradeInput}
            className="p-2 rounded bg-gray-800 border border-gray-600" />
          <input name="grade" type="number" placeholder="Grade (0-10)" value={gradeForm.grade} onChange={handleGradeInput}
            className="p-2 rounded bg-gray-800 border border-gray-600" />
        </div>
        <button onClick={submitGrade} className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700">Submit Grade</button>
      </div>

      {message.text && (
        <p className={`mt-4 text-sm ${message.type === "error" ? "text-red-400" : "text-green-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}