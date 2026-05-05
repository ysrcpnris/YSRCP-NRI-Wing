import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

// Fallback content used only while the DB query is in flight or if the
// admin hasn't curated any rows yet. The component swaps these out for
// the live `testimonials` table contents on mount.
const TESTIMONIALS_DATA: Testimonial[] = [
  {
    quote:
      "Jagan Anna's people-first governance inspires NRIs worldwide. His welfare schemes changed lives—proud to stand with him! Come back stronger!",
    author: "MR. Bharath Kandula",
    role: "Australia",
  },
  {
    quote:
      "From telemedicine top rank to industrial investments—Jagan Anna balanced welfare with strong economic development!",
    author: "MR. Vamsi",
    role: "Australia",
  },
  {
    quote:
      "Under Jagan garu, AP topped Ease of Doing Business for consecutive years. Investor-friendly policies attracted global giants—economic boom!",
    author: "MR. Brahma Reddy",
    role: "Australia",
  },
  {
    quote:
      "Jagan garu's Global Investors Summit sealed Rs 13 lakh cr MoUs! Energy, IT, manufacturing—huge job creation for Andhra's future!",
    author: "MR. Bujje Babu",
    role: "Newzealand",
  },
  {
    quote:
      "Jagan Mohan Reddy's port & airport expansions + incentives drove exports & manufacturing. AP's economy transformed!",
    author: "MR. Krishna Reddy",
    role: "Australia",
  },
  {
    quote:
      "Legacy of Jagan garu: Massive investments, IT hubs, port growth—Andhra Pradesh's economic engine revved up under his vision!",
    author: "MR. Balaram Raju",
    role: "Baharain",
  },
  {
    quote:
      "Door-step governance & Navaratnalu delivered promises honestly. Jagan Mohan Reddy brought transparency & welfare to every household!",
    author: "MR. Elias",
    role: "GCC",
  },
  {
    quote:
      "Jagan garu's BC, SC, ST & minority empowerment schemes uplifted millions. Inclusive growth at its best—AP shines because of him!",
    author: "MR. Balireddy",
    role: "Kuwait",
  },
  {
    quote:
      "Youth skill training & job placements under Jagan's rule created opportunities. His focus on employment changed young Andhra!",
    author: "MR. Sashikiran",
    role: "Qatar",
  },
  {
    quote:
      "Jagan Anna's port-led industrialization unlocked AP's coastline potential. New ports & investments boosted economy massively! True visionary leader.",
    author: "MR. Shiva Annapareddy",
    role: "USA",
  },
  {
    quote:
      "Under Jagan garu, AP achieved No.1 Ease of Doing Business rank for years. Plug-and-play industries attracted huge global investments!",
    author: "MR. K V Reddy",
    role: "USA",
  },
  {
    quote:
      "Jagan Mohan Reddy's vision doubled manufacturing & trade via ports, airports, corridors. AP's GSDP soared to 11.43% growth—economic powerhouse!",
    author: "MR. Krishna Koduru",
    role: "USA",
  },
  {
    quote:
      "Infosys Development Center & Adani's massive data park in Vizag under Jagan's rule. IT boom created thousands of jobs & positioned AP as tech hub!",
    author: "MR. Subba Reddy Pammi",
    role: "USA",
  },
  {
    quote:
      "Jagan Anna pushed IT policy with incentives, subsidies & three IT Concept Cities. Futuristic reforms made AP fastest-growing state economically!",
    author: "MR. Chandrahas Peddamallu",
    role: "USA",
  },
  {
    quote:
      "Port expansions like Ramayapatnam & Machilipatnam under Jagan garu drove cargo growth & blue economy. AP's industrial rise is unmatched!",
    author: "MR. Venu CH",
    role: "Canada",
  },
  {
    quote:
      "Jagan's industrial corridors (Hyderabad-Bangalore, Vizag-Chennai) & green energy push attracted Rs. lakhs cr investments. Economic revival!",
    author: "MR. Bhaskar Nallamilli",
    role: "Malaysia",
  },
  {
    quote:
      "From Rs. 13 lakh cr at GIS Summit to MSME job surge—Jagan Mohan Reddy's policies generated lakhs of jobs & boosted AP's economy!",
    author: "MR. Murali Krishna",
    role: "Singapore",
  },
  {
    quote:
      "Jagan garu's transparent governance & investor-friendly policies ranked AP No.1 in EoDB. Industries flourished despite challenges!",
    author: "MR. Karthik",
    role: "Netherlands",
  },
  {
    quote:
      "Adani's 300 MW data centers & tech park in Vizag—Jagan Anna's efforts connected AP to global IT ecosystem & created massive employment!",
    author: "Dr. Pradeep Chinta",
    role: "UK",
  },
  {
    quote:
      "High GSDP growth, per capita income rise & double-digit sector GVAs under Jagan Mohan Reddy—silent economic revolution!",
    author: "MR. Obul Reddy",
    role: "UK",
  },
  {
    quote:
      "Amma Vodi, Vidya Kanuka, & health cards touched every family. Jagan's Navaratnalu made welfare direct & effective!",
    author: "MR. Vikram",
    role: "South Africa",
  },
];

const Testimonials = () => {
  // Live admin-managed testimonials. While loading or when the admin
  // hasn't added any rows yet, we keep showing the static defaults
  // above so the section is never blank.
  const [items, setItems] = useState<Testimonial[]>(TESTIMONIALS_DATA);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("name, location, message")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data && data.length > 0) {
        setItems(
          data.map((d: any) => ({
            quote: d.message,
            author: d.name,
            role: d.location,
          }))
        );
      }
    };
    void load();

    // Realtime: refresh when an admin adds, edits, hides, or deletes.
    const channel = supabase
      .channel("testimonials-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "testimonials" },
        load
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  // Decide at runtime whether the rendered cards overflow the viewport.
  // If they don't (e.g. only one or two testimonials), we render the
  // single set centered with no animation — duplicating would show the
  // same testimonial twice next to itself, and scrolling a non-overflowing
  // strip looks like a glitch. When content does overflow we render two
  // copies back-to-back so the marquee can loop seamlessly.
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useLayoutEffect(() => {
    const recompute = () => {
      const container = containerRef.current;
      const probe = probeRef.current;
      if (!container || !probe) return;
      // Probe holds exactly one set of cards (no duplication).
      const overflow = probe.scrollWidth > container.clientWidth;
      setShouldScroll(overflow);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [items]);

  // Cards rendered into the visible track. When marquee mode is on we
  // need a duplicate set behind the first one to fill the gap during
  // the translateX(-50%) loop. When off, render exactly one set.
  const rendered = shouldScroll ? [...items, ...items] : items;

  return (
    <section className="relative bg-white py-10 sm:py-14 overflow-hidden">
      <div className="text-center mb-6 sm:mb-8 px-4">
        <h2
          className="text-lg sm:text-2xl md:text-3xl font-black uppercase text-primary-600 leading-tight"
        >
          Voices of Our Global Community
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">
          What NRIs across the world are saying
        </p>
      </div>

      {/* Hidden probe — measures the natural width of one set of cards
          so we can decide whether scrolling is necessary. Visually
          identical layout to the real track but absolutely positioned
          off-screen so it never appears to the user. */}
      <div
        ref={probeRef}
        aria-hidden="true"
        className="absolute -top-[9999px] left-0 flex gap-4 sm:gap-6 px-4 pointer-events-none invisible"
      >
        {items.map((item, idx) => (
          <div
            key={`probe-${idx}`}
            className="w-[280px] sm:w-[340px] md:w-[380px] flex-shrink-0"
          >
            {item.quote}
          </div>
        ))}
      </div>

      <div ref={containerRef} className="relative w-full overflow-hidden">
        <div
          className={`${shouldScroll ? "marquee-track" : "static-track justify-center"} flex gap-4 sm:gap-6 px-4`}
        >
          {rendered.map((item, idx) => {
            const isGreen = idx % 2 === 0;
            const borderColor = isGreen ? "border-l-green-600" : "border-l-blue-600";
            const textColor = isGreen ? "text-green-700" : "text-primary-700";

            return (
              <div
                key={idx}
                className={`w-[280px] sm:w-[340px] md:w-[380px] min-h-[200px] sm:min-h-[220px]
                bg-white rounded-2xl shadow-md border border-gray-200
                border-l-[6px] ${borderColor}
                p-5 sm:p-6 flex flex-col justify-between flex-shrink-0`}
              >
                <p
                  className={`italic text-sm sm:text-base leading-relaxed text-justify ${textColor}`}
                >
                  "{item.quote}"
                </p>

                <div className="mt-4 sm:mt-6 text-right">
                  <p className={`font-black text-xs uppercase ${textColor}`}>
                    {item.author}
                  </p>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">
                    {item.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .marquee-track {
          width: max-content;
          animation: testimonial-scroll 30s linear infinite;
          will-change: transform;
        }

        /* When content fits the viewport, no animation — just a static,
           centered row. width:auto lets justify-center actually take
           effect (a max-content track ignores it). */
        .static-track {
          width: 100%;
        }

        @keyframes testimonial-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        @media (min-width: 768px) {
          .marquee-track {
            animation-duration: 50s;
          }
        }

        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default Testimonials;