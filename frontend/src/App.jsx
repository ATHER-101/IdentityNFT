// App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import FeePayment from "./Pages/FeePayment";
import AddCourse from "./Pages/AddCourse";
import EditCourse from "./Pages/EditCourse";
import CourseDashboard from "./Pages/CourseDashboard";
import RegisterCourse from "./Pages/RegisterCourse";
import AmenitiesAccess from "./Pages/AmenitiesAccess";
import RewardNFTMarketplace from "./Pages/RewardNFTMarketplace";

function App() {
  const [nftData, setNftData] = useState(null);
  return (
    <div className="h-full min-h-screen w-screen bg-gray-900 text-white p-6">
      <Routes>
        <Route path="/" element={<Home nftData={nftData} setNftData={setNftData}/>} />
        <Route path="/fee-payment" element={<FeePayment nftData={nftData}/>} />
        <Route path="/add-course" element={<AddCourse nftData={nftData}/>} />
        <Route path="/edit-course" element={<EditCourse nftData={nftData}/>} />
        <Route path="/register-course" element={<RegisterCourse nftData={nftData}/>} />
        <Route path="/course-dashboard" element={<CourseDashboard nftData={nftData}/>} />
        <Route path="/amenities-access" element={<AmenitiesAccess/>} />
        <Route path="/marketplace" element={<RewardNFTMarketplace nftData={nftData}/>} />
      </Routes>
    </div>
  );
}

export default App;