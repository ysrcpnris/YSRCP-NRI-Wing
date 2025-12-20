import React, { useEffect, useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Scale,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type ServiceRequest = {
  id: number;
  user_id: string;
  service_type: string;
  applicant_name: string;
  current_location: string;
  description: string;
  status: string;
  created_at: string;
};

const serviceIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "student":
      return <GraduationCap className="text-blue-600" />;
    case "legal":
      return <Scale className="text-purple-600" />;
    case "career":
      return <Briefcase className="text-amber-600" />;
    default:
      return <Users className="text-gray-600" />;
  }
};

export default function ServiceInbox() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  /* ================= FETCH REQUESTS ================= */
  const fetchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Service fetch error:", error);
    } else {
      setRequests(data as ServiceRequest[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (id: number, status: string) => {
    const { error } = await supabase
      .from("service_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Failed to update status");
      return;
    }

    fetchRequests();
  };

  /* ================= FILTER ================= */
  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  /* ================= UI ================= */
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-gray-800">
          📨 Service Requests Inbox
        </h2>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border px-3 py-2 rounded text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading requests…</p>
      ) : filteredRequests.length === 0 ? (
        <p className="text-sm text-gray-500">No service requests found.</p>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="border rounded-xl p-4 hover:shadow transition"
            >
              {/* HEADER */}
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    {serviceIcon(req.service_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {req.service_type.toUpperCase()} SERVICE
                    </h3>
                    <p className="text-xs text-gray-500">
                      {req.applicant_name}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    req.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : req.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              {/* BODY */}
              <div className="mt-3 text-sm text-gray-600">
                <p className="mb-2">{req.description}</p>

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {req.current_location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />{" "}
                    {new Date(req.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
              {req.status === "pending" && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => updateStatus(req.id, "approved")}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => updateStatus(req.id, "rejected")}
                    className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
