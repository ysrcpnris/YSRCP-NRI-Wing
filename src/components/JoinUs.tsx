import { CheckCircle, Users, Globe, Heart } from 'lucide-react';

type JoinUsProps = {
  onRegister: () => void;
};

export default function JoinUs({ onRegister }: JoinUsProps) {
  const benefits = [
    'Connect with local AP leaders and coordinators',
    'Access student assistance and mentorship programs',
    'Job opportunities and career referrals',
    'Participate in virtual and in-person events',
    'Submit and track grievances',
    'Network with NRIs in your city',
    'Contribute to AP development initiatives',
    'Regular updates on party activities'
  ];

  return (
    <section id="join" className="py-20 bg-gradient-to-br from-blue-600 to-green-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Join the Movement</h2>
            <p className="text-xl mb-8 text-blue-100">
              Become part of a global community of NRIs dedicated to Andhra Pradesh's progress and YSR Congress Party's vision.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-3">
                <Users className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">45,000+ Members</h3>
                  <p className="text-blue-100">Across 50+ countries</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Globe className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Global Network</h3>
                  <p className="text-blue-100">Regional coordinators</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Heart className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Community Support</h3>
                  <p className="text-blue-100">Education & employment</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Verified Platform</h3>
                  <p className="text-blue-100">Official YSRCP portal</p>
                </div>
              </div>
            </div>

            <button
              onClick={onRegister}
              className="bg-white text-primary-600 px-10 py-4 rounded-full text-lg font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Register Now
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
            <h3 className="text-2xl font-bold mb-6">Member Benefits</h3>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-green-300" />
                  <p className="text-white">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
