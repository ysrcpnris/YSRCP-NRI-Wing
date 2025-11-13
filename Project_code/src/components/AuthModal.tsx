import React, { useState, useRef, useEffect } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type AuthModalProps = {
  mode: "signin" | "signup";
  onClose: () => void;
  onSwitchMode: () => void;
};

export default function AuthModal({
  mode,
  onClose,
  onSwitchMode,
}: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isMounted = useRef(true);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetMethod, setResetMethod] = useState<"email" | "otp">("email");

  const [formData, setFormData] = useState({
    // Personal Information
    first_name: "",
    last_name: "",
    mobile_number: "",
    whatsapp_number: "",
    email: "",
    password: "",
    country_of_residence: "",
    state_abroad: "",
    city_abroad: "",

    // Indian Address Details
    indian_state: "",
    district: "",
    assembly_constituency: "",
    mandal: "",
    village: "",

    // Demographics & Professional Details
    gender: "",
    dob: "",
    profession: "",
    organization: "",
    role_designation: "",

    // Engagement & Participation
    contribution: "",
    participate_campaign: "",
    suggestions: "",

    // Social Media Handles
    instagram_id: "",
    facebook_id: "",
    twitter_id: "",
    linkedin_id: "",

    // Referral
    referred_by: "",
  });

  // Sample data for dropdowns
  // const countries = [
  //   "USA",
  //   "UK",
  //   "Canada",
  //   "Australia",
  //   "Germany",
  //   "UAE",
  //   "Singapore",
  //   "Malaysia",
  //   "New Zealand",
  //   "Netherlands",
  // ];
  // const indianStates = [
  //   "Andhra Pradesh",
  //   "Telangana",
  //   "Tamil Nadu",
  //   "Karnataka",
  //   "Maharashtra",
  // ];
  const professions = ["Job", "Business", "Student"];
  const contributions = [
    "Tech Support",
    "Social Media",
    "Election Campaign Online",
    "Election Campaign Offline",
    "Podcasting",
  ];
  // Country → States → Cities Mapping
  // 🌍 Country → States/Regions → Cities Mapping
  const countryData: Record<string, { name: string; cities: string[] }[]> = {
    USA: [
      {
        name: "California",
        cities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento"],
      },
      { name: "Texas", cities: ["Houston", "Dallas", "Austin", "San Antonio"] },
      {
        name: "Florida",
        cities: ["Miami", "Orlando", "Tampa", "Jacksonville"],
      },
      {
        name: "New York",
        cities: ["New York City", "Buffalo", "Rochester", "Albany"],
      },
      {
        name: "Illinois",
        cities: ["Chicago", "Springfield", "Peoria", "Naperville"],
      },
    ],

    UK: [
      {
        name: "England",
        cities: ["London", "Manchester", "Liverpool", "Birmingham", "Leeds"],
      },
      {
        name: "Scotland",
        cities: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"],
      },
      { name: "Wales", cities: ["Cardiff", "Swansea", "Newport", "Wrexham"] },
      {
        name: "Northern Ireland",
        cities: ["Belfast", "Londonderry", "Lisburn", "Newry"],
      },
    ],

    Canada: [
      {
        name: "Ontario",
        cities: ["Toronto", "Ottawa", "Mississauga", "Hamilton", "London"],
      },
      {
        name: "British Columbia",
        cities: ["Vancouver", "Victoria", "Kelowna", "Surrey"],
      },
      {
        name: "Quebec",
        cities: ["Montreal", "Quebec City", "Laval", "Gatineau"],
      },
      {
        name: "Alberta",
        cities: ["Calgary", "Edmonton", "Red Deer", "Lethbridge"],
      },
    ],

    Australia: [
      {
        name: "New South Wales",
        cities: ["Sydney", "Newcastle", "Wollongong", "Parramatta"],
      },
      {
        name: "Victoria",
        cities: ["Melbourne", "Geelong", "Ballarat", "Bendigo"],
      },
      {
        name: "Queensland",
        cities: ["Brisbane", "Gold Coast", "Cairns", "Townsville"],
      },
      {
        name: "Western Australia",
        cities: ["Perth", "Fremantle", "Joondalup", "Albany"],
      },
    ],

    Germany: [
      {
        name: "Bavaria",
        cities: ["Munich", "Nuremberg", "Augsburg", "Regensburg"],
      },
      { name: "Berlin", cities: ["Berlin"] },
      {
        name: "North Rhine-Westphalia",
        cities: ["Cologne", "Düsseldorf", "Dortmund", "Bonn"],
      },
      { name: "Hesse", cities: ["Frankfurt", "Wiesbaden", "Kassel"] },
    ],

    UAE: [
      {
        name: "Dubai",
        cities: ["Dubai City", "Jumeirah", "Deira", "Bur Dubai"],
      },
      { name: "Abu Dhabi", cities: ["Abu Dhabi City", "Al Ain", "Mussafah"] },
      { name: "Sharjah", cities: ["Sharjah City", "Al Nahda", "Khor Fakkan"] },
      { name: "Ajman", cities: ["Ajman City", "Al Jurf"] },
    ],

    Singapore: [
      {
        name: "Central Region",
        cities: ["Singapore City", "Marina Bay", "Bukit Merah"],
      },
      { name: "East Region", cities: ["Tampines", "Bedok", "Pasir Ris"] },
      { name: "North Region", cities: ["Woodlands", "Yishun", "Sembawang"] },
    ],

    Malaysia: [
      {
        name: "Selangor",
        cities: ["Shah Alam", "Petaling Jaya", "Subang Jaya", "Klang"],
      },
      { name: "Penang", cities: ["George Town", "Bayan Lepas", "Butterworth"] },
      {
        name: "Kuala Lumpur",
        cities: ["Kuala Lumpur City", "Ampang", "Setapak"],
      },
      { name: "Johor", cities: ["Johor Bahru", "Batu Pahat", "Muar"] },
    ],

    NewZealand: [
      { name: "Auckland", cities: ["Auckland City", "Manukau", "Waitakere"] },
      {
        name: "Wellington",
        cities: ["Wellington City", "Lower Hutt", "Porirua"],
      },
      { name: "Canterbury", cities: ["Christchurch", "Timaru", "Ashburton"] },
      { name: "Otago", cities: ["Dunedin", "Queenstown", "Oamaru"] },
    ],

    Netherlands: [
      { name: "North Holland", cities: ["Amsterdam", "Haarlem", "Hilversum"] },
      {
        name: "South Holland",
        cities: ["Rotterdam", "The Hague", "Leiden", "Delft"],
      },
      { name: "Utrecht", cities: ["Utrecht City", "Amersfoort", "Nieuwegein"] },
      { name: "Gelderland", cities: ["Nijmegen", "Arnhem", "Apeldoorn"] },
    ],

    France: [
      {
        name: "Île-de-France",
        cities: ["Paris", "Versailles", "Boulogne-Billancourt"],
      },
      {
        name: "Provence-Alpes-Côte d'Azur",
        cities: ["Nice", "Marseille", "Cannes", "Toulon"],
      },
      { name: "Auvergne-Rhône-Alpes", cities: ["Lyon", "Grenoble", "Annecy"] },
      { name: "Occitanie", cities: ["Toulouse", "Montpellier", "Nîmes"] },
    ],

    Italy: [
      { name: "Lazio", cities: ["Rome", "Viterbo", "Latina"] },
      { name: "Lombardy", cities: ["Milan", "Bergamo", "Brescia"] },
      { name: "Tuscany", cities: ["Florence", "Pisa", "Siena"] },
      { name: "Sicily", cities: ["Palermo", "Catania", "Messina"] },
    ],

    Japan: [
      { name: "Tokyo Prefecture", cities: ["Tokyo", "Shinjuku", "Shibuya"] },
      { name: "Osaka Prefecture", cities: ["Osaka", "Sakai", "Higashiosaka"] },
      {
        name: "Kanagawa Prefecture",
        cities: ["Yokohama", "Kawasaki", "Fujisawa"],
      },
      { name: "Hokkaido", cities: ["Sapporo", "Hakodate", "Asahikawa"] },
    ],

    SouthAfrica: [
      { name: "Gauteng", cities: ["Johannesburg", "Pretoria", "Soweto"] },
      { name: "Western Cape", cities: ["Cape Town", "Stellenbosch", "George"] },
      {
        name: "KwaZulu-Natal",
        cities: ["Durban", "Pietermaritzburg", "Richards Bay"],
      },
    ],

    Brazil: [
      { name: "São Paulo", cities: ["São Paulo", "Campinas", "Santos"] },
      {
        name: "Rio de Janeiro",
        cities: ["Rio de Janeiro", "Niterói", "Petrópolis"],
      },
      {
        name: "Bahia",
        cities: ["Salvador", "Feira de Santana", "Vitória da Conquista"],
      },
      { name: "Paraná", cities: ["Curitiba", "Londrina", "Maringá"] },
    ],
  };

  // Indian States → Districts → Assembly Constituencies
  const indianAddressData: Record<
    string,
    { name: string; constituencies: string[] }[]
  > = {
    "Andhra Pradesh": [
      {
        name: "Anantapur",
        constituencies: [
          "Anantapur Urban",
          "Dharmavaram",
          "Tadipatri",
          "Gooty",
          "Kalyandurg",
        ],
      },
      {
        name: "Chittoor",
        constituencies: [
          "Chittoor",
          "Punganur",
          "Tirupati",
          "Nagari",
          "Palamaner",
        ],
      },
      {
        name: "Guntur",
        constituencies: [
          "Guntur West",
          "Guntur East",
          "Mangalagiri",
          "Tenali",
          "Sattenapalli",
        ],
      },
      {
        name: "Krishna",
        constituencies: [
          "Vijayawada West",
          "Vijayawada East",
          "Machilipatnam",
          "Nuzvid",
          "Avanigadda",
        ],
      },
      {
        name: "Nellore",
        constituencies: [
          "Nellore City",
          "Kavali",
          "Atmakur",
          "Gudur",
          "Udayagiri",
        ],
      },
      {
        name: "Prakasam",
        constituencies: [
          "Ongole",
          "Addanki",
          "Chirala",
          "Markapuram",
          "Kandukur",
        ],
      },
      {
        name: "Visakhapatnam",
        constituencies: [
          "Visakhapatnam North",
          "Visakhapatnam South",
          "Bhimili",
          "Gajuwaka",
          "Pendurthi",
        ],
      },
      {
        name: "East Godavari",
        constituencies: [
          "Rajahmundry City",
          "Kakinada",
          "Amalapuram",
          "Peddapuram",
          "Rampachodavaram",
        ],
      },
      {
        name: "West Godavari",
        constituencies: [
          "Tadepalligudem",
          "Eluru",
          "Bhimavaram",
          "Tanuku",
          "Narasapuram",
        ],
      },
      {
        name: "Kurnool",
        constituencies: [
          "Kurnool",
          "Adoni",
          "Nandikotkur",
          "Panyam",
          "Kodumur",
        ],
      },
      {
        name: "Kadapa (YSR)",
        constituencies: [
          "Kadapa",
          "Pulivendula",
          "Badvel",
          "Rajampet",
          "Mydukur",
        ],
      },
      {
        name: "Srikakulam",
        constituencies: [
          "Srikakulam",
          "Amadalavalasa",
          "Palasa",
          "Ichchapuram",
          "Pathapatnam",
        ],
      },
      {
        name: "Vizianagaram",
        constituencies: [
          "Vizianagaram",
          "Bobbili",
          "Nellimarla",
          "Parvathipuram",
          "Salur",
        ],
      },
      {
        name: "Nandyal",
        constituencies: [
          "Nandyal",
          "Allagadda",
          "Banaganapalle",
          "Dhone",
          "Panyam",
        ],
      },
      {
        name: "West Godavari (New)",
        constituencies: ["Polavaram", "Chintalapudi", "Nidadavole"],
      },
    ],

    Telangana: [
      {
        name: "Hyderabad",
        constituencies: [
          "Khairatabad",
          "Jubilee Hills",
          "Serilingampally",
          "Sanathnagar",
          "Amberpet",
          "Malakpet",
          "Karwan",
          "Goshamahal",
          "Charminar",
          "Yakutpura",
        ],
      },
      {
        name: "Rangareddy",
        constituencies: [
          "Ibrahimpatnam",
          "L.B. Nagar",
          "Maheshwaram",
          "Rajendranagar",
          "Chevella",
          "Vikarabad",
        ],
      },
      {
        name: "Medchal–Malkajgiri",
        constituencies: [
          "Malkajgiri",
          "Quthbullapur",
          "Kukatpally",
          "Uppal",
          "Bachupally",
        ],
      },
      {
        name: "Nizamabad",
        constituencies: ["Nizamabad Urban", "Balkonda", "Bodhan", "Armoor"],
      },
      {
        name: "Karimnagar",
        constituencies: [
          "Karimnagar",
          "Manakondur",
          "Huzurabad",
          "Choppadandi",
        ],
      },
      {
        name: "Warangal",
        constituencies: [
          "Warangal East",
          "Warangal West",
          "Parkal",
          "Narsampet",
          "Bhupalpally",
        ],
      },
      { name: "Hanamkonda", constituencies: ["Hanamkonda", "Wardhannapet"] },
      {
        name: "Khammam",
        constituencies: ["Khammam", "Palair", "Madhira", "Wyra", "Sathupalli"],
      },
      {
        name: "Mahbubnagar",
        constituencies: [
          "Mahbubnagar",
          "Jadcherla",
          "Shadnagar",
          "Devarakadra",
          "Makthal",
        ],
      },
      {
        name: "Nalgonda",
        constituencies: [
          "Nalgonda",
          "Munugode",
          "Miryalaguda",
          "Suryapet",
          "Kodad",
        ],
      },
      {
        name: "Adilabad",
        constituencies: ["Adilabad", "Boath", "Nirmal", "Asifabad", "Khanapur"],
      },
      {
        name: "Medak",
        constituencies: ["Medak", "Siddipet", "Narsapur", "Dubbak", "Gajwel"],
      },
      {
        name: "Kamareddy",
        constituencies: ["Kamareddy", "Banswada", "Yellareddy", "Jukkal"],
      },
      {
        name: "Mahabubabad",
        constituencies: ["Mahabubabad", "Dornakal", "Maripeda"],
      },
      {
        name: "Nagarkurnool",
        constituencies: ["Nagarkurnool", "Achampet", "Kalwakurthy", "Amrabad"],
      },
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 🧩 Client-side validation for signup password
    if (mode === "signup") {
      if (!formData.password || formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }
      if (formData.password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);

    // helper: promise timeout wrapper
    const withTimeout = <T,>(p: Promise<T>, ms = 15000): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const id = setTimeout(() => reject(new Error("Request timed out")), ms);
        p.then((res) => {
          clearTimeout(id);
          resolve(res);
        }).catch((err) => {
          clearTimeout(id);
          reject(err);
        });
      });

    try {
      // local admin shortcut
      if (
        mode === "signin" &&
        formData.email === "nriwing@gmail.com" &&
        formData.password === "nriwing"
      ) {
        // ensure loading is cleared before navigating
        if (isMounted.current) setLoading(false);
        onClose(); // close modal
        localStorage.setItem("is_admin", "true");
        window.location.href = "/admin/dashboard"; // navigate directly
        return;
      }

      if (mode === "signin") {
        await withTimeout(signIn(formData.email, formData.password), 15000);
        // sign-in success: close modal and let app auth flow handle navigation
        if (isMounted.current) setLoading(false);
        onClose();
        return;
      } else {
        await withTimeout(
          signUp(formData.email, formData.password, {
            first_name: formData.first_name,
            last_name: formData.last_name,
            mobile_number: formData.mobile_number,
            whatsapp_number: formData.whatsapp_number,
            country_of_residence: formData.country_of_residence,
            state_abroad: formData.state_abroad,
            indian_state: formData.indian_state,
            district: formData.district,
            mandal: formData.mandal,
            village: formData.village,
            gender: formData.gender,
            dob: formData.dob,
            profession: formData.profession,
            organization: formData.organization,
            role_designation: formData.role_designation,
            contribution: formData.contribution,
            participate_campaign: formData.participate_campaign,
            suggestions: formData.suggestions,
            instagram_id: formData.instagram_id,
            facebook_id: formData.facebook_id,
            twitter_id: formData.twitter_id,
            linkedin_id: formData.linkedin_id,
            referred_by: formData.referred_by,
          }),
          20000
        );

        // signup success: keep modal open, show toast, clear sensitive fields
        if (isMounted.current) setLoading(false);
        toast.success("Registration successful! Please check your email for verification.", {
          position: "top-right",
          autoClose: 5000,
        });
        setFormData((f) => ({ ...f, password: "" }));
        setConfirmPassword("");
        return;
      }
    } catch (err: unknown) {
      // helper to extract a safe message from unknown errors without using `any`
      const getErrorMessage = (e: unknown): string => {
        if (e instanceof Error) return e.message;
        if (typeof e === "string") return e;
        if (typeof e === "object" && e !== null) {
          const maybe = e as Record<string, unknown>;
          if (typeof maybe.message === "string") return maybe.message;
        }
        return "An error occurred";
      };

      const msg = getErrorMessage(err);

      // detect common rate-limit / verification email errors and show friendly message
      if (/rate|too many|exceed|429/i.test(msg)) {
        toast.error(
          "Verification email rate limit exceeded. Please wait a few minutes (or up to an hour) before trying again, or use a different email address.",
          { position: "top-right", autoClose: 7000 }
        );
      } else {
        toast.error(msg, { position: "top-right", autoClose: 5000 });
      }

      setError(msg);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleForgotPassword = async () => {
    // Implement forgot password logic
    setError("Forgot password functionality not implemented yet");
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center "
        onMouseDown={() => onClose()}
      >
        <div
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>

          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === "signin" ? "Welcome Back" : "Join YSRCP NRI Wing"}
            </h2>
            <p className="text-gray-600 mb-6">
              {mode === "signin"
                ? "Sign in to access your dashboard"
                : "Register to become part of our global community"}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {forgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setResetMethod("email")}
                    className={`flex-1 py-2 px-4 rounded-lg ${
                      resetMethod === "email"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Reset Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetMethod("otp")}
                    className={`flex-1 py-2 px-4 rounded-lg ${
                      resetMethod === "otp"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    OTP
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading
                    ? "Sending..."
                    : `Send ${resetMethod === "email" ? "Reset Link" : "OTP"}`}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotPassword(false)}
                  className="w-full text-blue-600 hover:text-blue-700 font-medium transition"
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    {/* Personal Information */}
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Personal Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.first_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                first_name: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.last_name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                last_name: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile Number{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={formData.mobile_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mobile_number: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+1 (123) 456-7890"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            WhatsApp Number{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={formData.whatsapp_number}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                whatsapp_number: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+1 (123) 456-7890"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        {/* Country Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country of Residence{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={formData.country_of_residence}
                            onChange={(e) => {
                              const selectedCountry = e.target.value;
                              setFormData({
                                ...formData,
                                country_of_residence: selectedCountry,
                                state_abroad: "",
                                city_abroad: "",
                              });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Country</option>
                            {Object.keys(countryData).map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* State Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <select
                            value={formData.state_abroad}
                            onChange={(e) => {
                              const selectedState = e.target.value;
                              setFormData({
                                ...formData,
                                state_abroad: selectedState,
                                city_abroad: "",
                              });
                            }}
                            disabled={!formData.country_of_residence}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          >
                            <option value="">Select State</option>
                            {formData.country_of_residence &&
                              countryData[formData.country_of_residence]?.map(
                                (state) => (
                                  <option key={state.name} value={state.name}>
                                    {state.name}
                                  </option>
                                )
                              )}
                          </select>
                        </div>

                        {/* City Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <select
                            value={formData.city_abroad}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                city_abroad: e.target.value,
                              })
                            }
                            disabled={!formData.state_abroad}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          >
                            <option value="">Select City</option>
                            {formData.country_of_residence &&
                              formData.state_abroad &&
                              countryData[formData.country_of_residence]
                                ?.find(
                                  (state) =>
                                    state.name === formData.state_abroad
                                )
                                ?.cities.map((city) => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    {/* Password fields for signup */}
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Password{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Indian Address Details */}

                    {/* Indian Address Details */}
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Indian Address Details
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* State Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={formData.indian_state}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                indian_state: e.target.value,
                                district: "",
                                assembly_constituency: "",
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select State</option>
                            {Object.keys(indianAddressData).map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* District Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            District <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={formData.district}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                district: e.target.value,
                                assembly_constituency: "",
                              })
                            }
                            disabled={!formData.indian_state}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          >
                            <option value="">Select District</option>
                            {formData.indian_state &&
                              indianAddressData[formData.indian_state]?.map(
                                (d) => (
                                  <option key={d.name} value={d.name}>
                                    {d.name}
                                  </option>
                                )
                              )}
                          </select>
                        </div>
                      </div>

                      {/* Assembly Constituency, Mandal, Village */}
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assembly Constituency{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={formData.assembly_constituency}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                assembly_constituency: e.target.value,
                              })
                            }
                            disabled={!formData.district}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                          >
                            <option value="">
                              Select Assembly Constituency
                            </option>
                            {formData.indian_state &&
                              formData.district &&
                              indianAddressData[formData.indian_state]
                                ?.find((d) => d.name === formData.district)
                                ?.constituencies.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mandal <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.mandal}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mandal: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Village <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.village}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                village: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Demographics & Professional Details */}
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Demographics & Professional Details
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gender <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-2">
                            {["Male", "Female"].map((gender) => (
                              <label key={gender} className="flex items-center">
                                <input
                                  type="radio"
                                  name="gender"
                                  value={gender}
                                  checked={formData.gender === gender}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      gender: e.target.value,
                                    })
                                  }
                                  className="mr-2"
                                />
                                {gender}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.dob || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, dob: e.target.value })
                            }
                            max={new Date().toISOString().split("T")[0]} // Prevent future dates
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Profession <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={formData.profession}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                profession: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Profession</option>
                            {professions.map((prof) => (
                              <option key={prof} value={prof}>
                                {prof}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Organization / Company
                          </label>
                          <input
                            type="text"
                            value={formData.organization}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                organization: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role / Designation
                          </label>
                          <input
                            type="text"
                            value={formData.role_designation}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                role_designation: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Engagement & Participation */}
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Engagement & Participation
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          How would you like to contribute?{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.contribution}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contribution: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Contribution</option>
                          {contributions.map((contrib) => (
                            <option key={contrib} value={contrib}>
                              {contrib}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Are you willing to participate in the upcoming
                          Assembly Election Campaign?{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {["Yes", "No"].map((option) => (
                            <label key={option} className="flex items-center">
                              <input
                                type="radio"
                                name="participate_campaign"
                                value={option}
                                checked={
                                  formData.participate_campaign === option
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    participate_campaign: e.target.value,
                                  })
                                }
                                className="mr-2"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Suggestions or Messages for the Party
                        </label>
                        <textarea
                          value={formData.suggestions}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              suggestions: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    {/* Referral Section */}
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Referral{" "}
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Who referred you?{" "}
                          <span className="text-gray-400 text-sm"></span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter name or email of referrer"
                          value={formData.referred_by}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              referred_by: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Social Media Handles */}
                    <div className="border-b pb-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Social Media Handles
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instagram ID
                          </label>
                          <input
                            type="text"
                            value={formData.instagram_id}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                instagram_id: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Facebook ID
                          </label>
                          <input
                            type="text"
                            value={formData.facebook_id}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                facebook_id: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            X (Twitter) ID
                          </label>
                          <input
                            type="text"
                            value={formData.twitter_id}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                twitter_id: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            LinkedIn ID
                          </label>
                          <input
                            type="text"
                            value={formData.linkedin_id}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                linkedin_id: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {mode === "signin" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium transition"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading
                    ? "Please wait..."
                    : mode === "signin"
                    ? "Sign In"
                    : "Register"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={onSwitchMode}
                className="text-blue-600 hover:text-blue-700 font-medium transition"
              >
                {mode === "signin"
                  ? "Don't have an account? Register"
                  : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
