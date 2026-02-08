import { useWallet } from "../context/WalletContext";
import { Target, Users, TrendingUp, Zap, ArrowRight, Shield, Coins, Award } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
  const { wallet, connectWallet } = useWallet();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px]" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 rounded-full text-brand-400 text-sm font-medium mb-8">
            <Zap size={14} />
            The Social Prediction Market for Personal Goals
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            Bet on Your
            <br />
            Friends' <span className="gradient-text">Ambitions</span>
          </h1>

          <p className="text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create goals, stake tokens, and let your friend circle trade on the probability
            of you achieving them. Skin in the game meets social accountability.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {wallet ? (
              <>
                <Link to="/circles" className="btn-primary text-lg px-8 py-3 flex items-center gap-2">
                  <Users size={20} />
                  My Circles
                  <ArrowRight size={18} />
                </Link>
                <Link to="/goals" className="btn-secondary text-lg px-8 py-3 flex items-center gap-2">
                  <Target size={20} />
                  Browse Goals
                </Link>
              </>
            ) : (
              <button onClick={connectWallet} className="btn-primary text-lg px-10 py-4 flex items-center gap-2">
                <Target size={22} />
                Get Started
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-dark-400 text-center mb-12 max-w-xl mx-auto">
            ForShure combines prediction markets with social accountability to
            create a new consumer primitive for personal growth.
          </p>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: "1. Create a Circle",
                description: "Invite your friends to form a goal circle. Everyone gets GSTK tokens to start.",
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                icon: Target,
                title: "2. Set a Goal",
                description: "Declare your ambition and stake tokens as commitment. Your friends can see it.",
                color: "text-brand-400",
                bg: "bg-brand-500/10",
              },
              {
                icon: TrendingUp,
                title: "3. Friends Trade",
                description: "Circle members buy YES or NO positions. Price reflects collective belief.",
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
              {
                icon: Award,
                title: "4. Prove & Earn",
                description: "Submit proof, get verified by friends. Winners take the pot. Award your supporters.",
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
              },
            ].map((step, i) => (
              <div key={i} className="card text-center group hover:border-dark-600/80 transition-all">
                <div className={`w-14 h-14 ${step.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <step.icon size={28} className={step.color} />
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why It's Different */}
      <section className="py-20 px-4 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Why ForShure?</h2>
          <p className="text-dark-400 text-center mb-12 max-w-xl mx-auto">
            At the intersection of prediction markets, social networks, and token economies.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="card">
              <Shield className="text-brand-400 mb-4" size={32} />
              <h3 className="font-bold text-lg mb-2">Skin in the Game</h3>
              <p className="text-sm text-dark-400 leading-relaxed">
                Unlike empty social media promises, staking tokens creates real accountability.
                You're not just saying you'll run a marathon — you're putting money on it.
              </p>
            </div>
            <div className="card">
              <Coins className="text-brand-400 mb-4" size={32} />
              <h3 className="font-bold text-lg mb-2">Social Prediction Market</h3>
              <p className="text-sm text-dark-400 leading-relaxed">
                Friends don't just cheer — they trade. The market price reveals what your
                circle truly believes about your chances. That signal is powerful.
              </p>
            </div>
            <div className="card">
              <Award className="text-brand-400 mb-4" size={32} />
              <h3 className="font-bold text-lg mb-2">Aligned Incentives</h3>
              <p className="text-sm text-dark-400 leading-relaxed">
                Friends who bet YES are financially incentivized to help you succeed.
                This turns passive followers into active supporters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to stake your ambitions?</h2>
          <p className="text-dark-400 mb-8">
            Join the social prediction market where your goals become tradeable assets.
          </p>
          {!wallet && (
            <button onClick={connectWallet} className="btn-primary text-lg px-10 py-4">
              Get Started
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-dark-500">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-brand-400" />
            <span>ForShure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
