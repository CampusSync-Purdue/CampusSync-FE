import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import RegisterPage from "../pages/RegisterPage";
import RoomsPage from "../pages/RoomsPage";
import RoomDetailsPage from "../pages/RoomDetailsPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/rooms" replace />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route path="/dashboard" element={<DashboardPage />} />

      <Route path="/rooms" element={<RoomsPage />} />

      <Route path="/rooms/:roomId" element={<RoomDetailsPage />} />

      <Route
        path="*"
        element={
          <main className="min-h-screen bg-slate-100 p-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Page Not Found
            </h1>
            <p className="mt-2 text-slate-600">
              The page you are looking for does not exist.
            </p>
          </main>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
