import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ResetPassword from "../components/ResetPassword";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8" style={{ border: "3px solid #0B4DA2" }}>
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-primary-700 hover:text-primary-500 font-medium transition mb-4"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            YSRCP NRI Wing
          </h1>
          <p className="text-gray-600 text-sm">Account Recovery</p>
        </div>

        {/* Reset Password Component */}
        <ResetPassword onBack={handleBack} />
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-md p-4 max-w-sm mx-auto">
        <p className="text-xs text-gray-600 text-center">
          <strong>Need Help?</strong> Contact our support team at{" "}
          <a href="mailto:support@ysrcpnri.org" className="text-primary-700 hover:underline">
            support@ysrcpnri.org
          </a>
        </p>
      </div>
    </div>
  );
}
