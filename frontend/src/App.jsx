// App.jsx
import { Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import FeePayment from "./Pages/FeePayment";
import AddCourse from "./Pages/AddCourse";
import EditCourse from "./Pages/EditCourse";
import CourseDashboard from "./Pages/CourseDashboard";

function App() {
  return (
    <div className="h-full min-h-screen w-screen bg-gray-900 text-white p-6">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fee-payment" element={<FeePayment />} />
        <Route path="/add-course" element={<AddCourse />} />
        <Route path="/edit-course" element={<EditCourse />} />
        <Route path="/course-dashboard" element={<CourseDashboard />} />
      </Routes>
    </div>
  );
}

export default App;