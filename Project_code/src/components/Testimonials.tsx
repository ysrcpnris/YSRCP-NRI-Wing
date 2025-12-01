import { useEffect, useRef } from "react";
import { Quote } from "lucide-react";

type TestimonialItem = {
name: string;
location: string;
role: string;
quote: string;
};

const testimonials: TestimonialItem[] = [
{ name: "Rajesh Kumar", location: "San Francisco, USA", role: "IT Professional", quote: "Being part of YSRCP NRI Wing helps me stay connected to my roots and contribute to Andhra Pradesh development from abroad." },
{ name: "Priya Reddy", location: "Dubai, UAE", role: "Healthcare Professional", quote: "The student assistance program helped my cousin get into a great university. Proud to support this initiative!" },
{ name: "Venkat Sharma", location: "London, UK", role: "Business Owner", quote: "Through the job assistance portal, I have been able to hire talented individuals from AP and give back to the community." },
{ name: "Anjali Naidu", location: "Toronto, Canada", role: "Entrepreneur", quote: "Supporting YSRCP NRI initiatives allows me to contribute to healthcare and education projects back home." },
{ name: "Sandeep Raju", location: "Singapore", role: "Consultant", quote: "The development showcase inspires me to invest in local startups and skill development programs in AP." },
{ name: "Meena Kumari", location: "Melbourne, Australia", role: "Teacher", quote: "I love seeing how these welfare programs positively impact students and women in Andhra Pradesh." },
{ name: "Ravi Varma", location: "New York, USA", role: "Engineer", quote: "Being connected to the NRI wing helps me contribute to infrastructure projects back home." },
];

export default function Testimonials() {
const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
const scrollContainer = scrollRef.current;
const scrollStep = 2;


const interval = setInterval(() => {
  if (!scrollContainer) return;
  let currentScroll = scrollContainer.scrollLeft + scrollStep;
  if (currentScroll >= scrollContainer.scrollWidth / 2) currentScroll = 0;
  scrollContainer.scrollTo({
    left: currentScroll,
    behavior: "smooth",
  });
}, 15);

return () => clearInterval(interval);


}, []);

// Duplicate items for continuous scrolling
const scrollingTestimonials = testimonials.concat(testimonials);

return ( <section className="py-20 bg-white"> <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> <div className="text-center mb-16"> <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
Voices from Our Community </h2> <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto"></div> </div>

    <div
      ref={scrollRef}
      className="flex gap-4 overflow-x-hidden whitespace-nowrap"
    >
      {scrollingTestimonials.map((testimonial, index) => (
        <div
          key={index}
          className="inline-block bg-gradient-to-br from-blue-50 to-green-50 p-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 min-w-[125px] flex-shrink-0"
        >
          <Quote className="w-6 h-6 text-blue-600 mb-2 opacity-50" />
          <p className="text-gray-700 text-xs leading-snug italic">{testimonial.quote}</p>
          <div className="mt-2">
            <h4 className="font-semibold text-gray-900 text-xs">{testimonial.name}</h4>
            <p className="text-[10px] text-gray-600">{testimonial.role}</p>
            <p className="text-[10px] text-blue-600">{testimonial.location}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>


);
}
