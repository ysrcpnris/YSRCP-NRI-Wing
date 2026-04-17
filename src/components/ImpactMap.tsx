import { MapPin } from 'lucide-react';

export default function ImpactMap() {
  const regions = [
    { name: 'North America', count: '15,000+', countries: ['USA', 'Canada'] },
    { name: 'Europe', count: '8,000+', countries: ['UK', 'Germany', 'France'] },
    { name: 'Middle East', count: '12,000+', countries: ['UAE', 'Saudi Arabia', 'Qatar'] },
    { name: 'Asia Pacific', count: '10,000+', countries: ['Australia', 'Singapore', 'Malaysia'] }
  ];

  // return (
  //   <section className="py-20 bg-gradient-to-b from-blue-50 to-green-50">
  //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  //       <div className="text-center mb-16">
  //         <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Global Presence</h2>
  //         <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
  //         <p className="text-xl text-gray-600 max-w-3xl mx-auto">
  //           NRI supporters across continents working together for Andhra Pradesh's development
  //         </p>
  //       </div>

  //       <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
  //         {regions.map((region, index) => (
  //           <div
  //             key={index}
  //             className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
  //           >
  //             <div className="flex items-center justify-center mb-4">
  //               <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
  //                 <MapPin className="w-6 h-6 text-white" />
  //               </div>
  //             </div>
  //             <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{region.name}</h3>
  //             <p className="text-3xl font-bold text-primary-600 text-center mb-3">{region.count}</p>
  //             <div className="flex flex-wrap gap-2 justify-center">
  //               {region.countries.map((country, idx) => (
  //                 <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
  //                   {country}
  //                 </span>
  //               ))}
  //             </div>
  //           </div>
  //         ))}
  //       </div>

  //       <div className="mt-12 text-center">
  //         <p className="text-2xl font-bold text-gray-900">
  //           <span className="text-primary-600">45,000+</span> NRI Supporters in <span className="text-green-600">50+</span> Countries
  //         </p>
  //       </div>
  //     </div>
  //   </section>
  // );
}
