import { Quote } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Rajesh Kumar',
      location: 'San Francisco, USA',
      role: 'IT Professional',
      quote: 'Being part of YSRCP NRI Wing helps me stay connected to my roots and contribute to Andhra Pradesh development from abroad.',
      image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200'
    },
    {
      name: 'Priya Reddy',
      location: 'Dubai, UAE',
      role: 'Healthcare Professional',
      quote: 'The student assistance program helped my cousin get into a great university. Proud to support this initiative!',
      image: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200'
    },
    {
      name: 'Venkat Sharma',
      location: 'London, UK',
      role: 'Business Owner',
      quote: 'Through the job assistance portal, I have been able to hire talented individuals from AP and give back to the community.',
      image: 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=200'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Voices from Our Community</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-blue-50 to-green-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <Quote className="w-10 h-10 text-blue-600 mb-4 opacity-50" />
              <p className="text-gray-700 mb-6 leading-relaxed italic">{testimonial.quote}</p>
              <div className="flex items-center">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-14 h-14 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-sm text-blue-600">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
