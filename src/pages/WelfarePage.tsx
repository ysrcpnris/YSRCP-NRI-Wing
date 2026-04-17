// src/pages/WelfarePage.jsx
import { useNavigate } from "react-router-dom";

const welfareSchemes = [
  {
    id: "amma-vodi",
    title: "Jagananna Amma Vodi",
    description: "Financial assistance for mothers to support children’s education."
  },
  {
    id: "vidya-deevena",
    title: "Jagananna Vidya Deevena",
    description: "Full fee reimbursement for students pursuing higher education."
  },
  {
    id: "vasathi-deevena",
    title: "Jagananna Vasathi Deevena",
    description: "Accommodation and food support for students staying away from home."
  },
  {
    id: "nri-connect",
    title: "Jagananna NRI Connect",
    description: "Empowering NRIs to stay connected with welfare initiatives and contribute to state development."
  },
  {
    id: "gorumudda",
    title: "Jagananna Gorumudda",
    description: "Nutritious meals provided to school children to improve health and education outcomes."
  },
  {
    id: "cheyutha",
    title: "Jagananna Cheyutha",
    description: "Skill development and livelihood programs for rural youth and women."
  },
  {
    id: "yuvanestham",
    title: "Jagananna Yuvanestham",
    description: "Comprehensive support for youth including education, employment, and entrepreneurship."
  },
];

export default function WelfarePage() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">Welfare Schemes</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {welfareSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl border border-gray-200 cursor-pointer transition"
              onClick={() => navigate(`/welfare/${scheme.id}`)}
            >
              <h3 className="text-2xl font-semibold text-primary-700 mb-2">{scheme.title}</h3>
              <p className="text-gray-600">{scheme.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
