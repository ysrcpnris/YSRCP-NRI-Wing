export default function About() {
  return (
    <section
      id="about"
      className="py-16 md:py-24"
      style={{
        background:
          "linear-gradient(135deg, rgba(0, 72, 181, 0.75), rgba(255, 255, 255, 0.69), rgba(0, 150, 70, 0.77))",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ================= HEADER ================= */}
        <div className="text-center mb-14 md:mb-20">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
            <span className="text-blue-700">About</span>{" "}
            <span className="text-green-600">YSRCP NRI Wing</span>
          </h2>

          <div className="w-20 md:w-28 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto my-4"></div>

          <p className="text-base md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed px-2">
            Uniting NRIs across the globe to contribute to Andhra Pradesh’s progress
            and strengthen the YSR Congress Party’s worldwide presence.
          </p>
        </div>

        {/* ================= ABOUT CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14">

          {/* LEFT CARD */}
          <div className="p-6 sm:p-8 md:p-10 rounded-2xl backdrop-blur-md bg-white/70 border border-blue-200 shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl md:text-3xl font-bold text-blue-800 mb-4 md:mb-6">
              About YSRCP
            </h3>

            <p className="text-blue-900 mb-4 leading-relaxed text-justify text-sm md:text-base">
              The Yuvajana Sramika Rythu Congress Party (YSRCP) is a people-centered
              political movement founded on the values of the late Dr. Y.S. Rajasekhara Reddy.
            </p>

            <p className="text-blue-900 mb-4 leading-relaxed text-justify text-sm md:text-base">
              Under the visionary leadership of Y.S. Jagan Mohan Reddy, the party champions
              welfare-driven governance, social justice, and inclusive development.
            </p>

            <p className="text-blue-900 leading-relaxed text-justify text-sm md:text-base">
              YSRCP continues to uplift farmers, workers, youth, and marginalized communities
              through transparent and impactful governance.
            </p>
          </div>

          {/* RIGHT CARD */}
          <div className="p-6 sm:p-8 md:p-10 rounded-2xl backdrop-blur-md bg-white/70 border border-green-200 shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl md:text-3xl font-bold text-green-800 mb-4 md:mb-6">
              Our Vision & Mission
            </h3>

            <h4 className="text-lg md:text-xl font-semibold text-green-700 mb-2">
              Vision
            </h4>
            <p className="text-green-800 mb-6 leading-relaxed text-justify text-sm md:text-base">
              To unite NRIs worldwide and create a strong global network that collaborates 
              towards Andhra Pradesh’s development and supports positive welfare governance.
            </p>

            <h4 className="text-lg md:text-xl font-semibold text-green-700 mb-2">
              Mission
            </h4>
            <p className="text-green-800 leading-relaxed text-justify text-sm md:text-base">
              To bridge NRIs with their homeland through structured support systems, 
              community engagement, and opportunities to participate actively in 
              developmental initiatives.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
