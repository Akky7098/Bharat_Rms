import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import EnquiryList from "../pages/EnquiryList";


function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/enquiries" element={<EnquiryList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
