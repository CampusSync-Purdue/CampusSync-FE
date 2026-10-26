import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";
import RegisterPage from "../pages/RegisterPage";
import AddRoomPage from "../pages/AddRoomPage";
import AdminReservationsPage from "../pages/AdminReservationsPage";
import MyBookingsPage from "../pages/MyBookingsPage";
import RoomsPage from "../pages/RoomsPage";
import RoomAvailabilityPage from "../pages/RoomAvailabilityPage";
import RoomDetailsPage from "../pages/RoomDetailsPage";
import { ProtectedRoute } from "./ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/availability" element={<RoomAvailabilityPage />} />
        <Route path="/rooms/:roomId" element={<RoomDetailsPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route path="/admin/rooms/new" element={<AddRoomPage />} />
        <Route path="/admin/reservations" element={<AdminReservationsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
