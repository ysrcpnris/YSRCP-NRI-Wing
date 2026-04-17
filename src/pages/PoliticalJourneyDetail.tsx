import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { journeyData } from "../lib/politicalJourneyData";

type Props = {
  setAuthMode: (mode: "signin" | "signup") => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function PoliticalJourneyDetail({ setAuthMode, setShowAuthModal }: Props) {
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const yearNum = Number(year);
  const data = journeyData[yearNum];

  return (
    <>
      <Header
        onSignUp={() => {
          setAuthMode("signup");
          setShowAuthModal(true);
        }}
      />

      <section className="min-h-screen bg-[#063A7A] py-24 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium mb-6 transition"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>

          {!data ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-2xl">
              <h1 className="text-2xl font-bold text-[#063A7A] mb-2">Year not found</h1>
              <p className="text-gray-600">
                No journey details available for {year}.
              </p>
            </div>
          ) : (
            <div className="bg-white text-black rounded-2xl shadow-2xl overflow-hidden border-4 border-accent-500 flex flex-col md:flex-row">
              <div className="md:w-2/5 flex-shrink-0">
                <img
                  src={data.image}
                  alt={data.title}
                  className="w-full h-56 md:h-full object-cover object-[50%_35%]"
                />
              </div>

              <div className="md:w-3/5 p-6 sm:p-8 md:p-10">
                <h1
                  className="text-xl sm:text-2xl md:text-3xl font-bold text-[#063A7A] mb-5 underline underline-offset-4 decoration-accent-500"
                  style={{ fontFamily: "Times New Roman, serif" }}
                >
                  {data.title}
                </h1>

                <ul className="list-disc ml-5 space-y-2.5 text-gray-800 text-sm sm:text-base leading-relaxed text-justify">
                  {data.points.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
