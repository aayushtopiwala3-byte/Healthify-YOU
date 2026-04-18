/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Dumbbell, 
  Utensils, 
  LayoutDashboard, 
  User, 
  MessageSquare, 
  ChevronRight, 
  Check, 
  Zap, 
  PieChart, 
  Clock, 
  Mail, 
  Menu, 
  X,
  Star,
  ArrowRight,
  LogOut,
  ChevronLeft,
  Chrome,
  ArrowRightCircle,
  Activity,
  Droplets,
  Scale
} from "lucide-react";

// --- Types ---
interface EquilibriumData {
  protocol: string;
  culprit_identified: string;
  night_notification: string;
  morning_dashboard: string;
  scientific_insight: string;
}

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  isOnboarded: boolean;
  basics?: { name: string; dob: string; gender: string };
  body?: { weight: number; weightUnit: 'kg' | 'lb'; height: number; heightUnit: 'cm' | 'ft'; bmi: number };
  goal?: { purpose: string; targetWeight: number; timeline: string; activityLevel: string };
  lifestyle?: { dietary: string[]; allergies: string[]; waterGoal: number };
  dailyCalories?: number;
}

// --- Helpers ---
const calculateBMI = (weight: number, height: number, wUnit: 'kg' | 'lb', hUnit: 'cm' | 'ft') => {
  let w = weight;
  let h = height;
  if (wUnit === 'lb') w = weight * 0.453592;
  if (hUnit === 'ft') h = height * 30.48;
  if (!h) return 0;
  const bmi = w / ((h / 100) ** 2);
  return Number(bmi.toFixed(1));
};

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'bg-blue-500' };
  if (bmi < 25) return { label: 'Normal', color: 'bg-green-500' };
  if (bmi < 30) return { label: 'Overweight', color: 'bg-orange-500' };
  return { label: 'Obese', color: 'bg-red-500' };
};

const calculateDailyCalories = (profile: UserProfile) => {
  if (!profile.body || !profile.basics || !profile.goal) return 2000;
  
  let w = profile.body.weight;
  let h = profile.body.height;
  if (profile.body.weightUnit === 'lb') w = w * 0.453592;
  if (profile.body.heightUnit === 'ft') h = h * 30.48;
  
  const birthDate = new Date(profile.basics.dob);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  
  // Mifflin-St Jeor
  let bmr = (10 * w) + (6.25 * h) - (5 * age);
  if (profile.basics.gender === 'Male') bmr += 5;
  else bmr -= 161;

  const multipliers: Record<string, number> = {
    'Sedentary': 1.2,
    'Light': 1.375,
    'Moderate': 1.55,
    'Very Active': 1.725,
    'Athlete': 1.9
  };
  
  let tdee = bmr * (multipliers[profile.goal.activityLevel] || 1.2);
  
  if (profile.goal.purpose === 'Lose Weight') tdee -= 500;
  if (profile.goal.purpose === 'Gain Weight') tdee += 500;
  
  return Math.round(tdee);
};

// --- View: Login Screen ---
function LoginScreen({ onLogin }: { onLogin: (user: Partial<UserProfile>) => void }) {
  const handleGoogleSignIn = async () => {
    try {
      const resp = await fetch('/api/auth/google/url');
      const { url } = await resp.json();
      const popup = window.open(url, 'google_oauth', 'width=500,height=600');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          onLogin({
            id: 'google_' + Math.random().toString(36).substr(2, 9),
            name: event.data.payload.name,
            email: event.data.payload.email,
            isGuest: false,
            isOnboarded: false
          });
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (e) {
      console.error(e);
      // Fallback if API fails or env not set
      onLogin({
        id: 'mock_google',
        name: 'Google Discovery',
        email: 'user@example.com',
        isGuest: false,
        isOnboarded: false
      });
    }
  };

  const handleGuestSignIn = () => {
    onLogin({
      id: 'guest_' + Math.random().toString(36).substr(2, 9),
      name: 'Guest User',
      isGuest: true,
      isOnboarded: false
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-white to-[#eef2e6] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border-b-[10px] border-accent"
      >
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-primary/20">
          <Zap fill="white" className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-secondary tracking-tight mb-2 uppercase">HealthifyYou</h1>
        <p className="text-app-text/50 font-bold text-sm mb-10 tracking-widest uppercase text-center">Your AI Health Companion</p>
        
        <div className="space-y-4">
          <button 
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-black/5 py-4 rounded-2xl font-black text-secondary hover:bg-black/[0.02] transition-all active:scale-95"
          >
            <Chrome className="w-5 h-5 text-blue-500" />
            Sign in with Google
          </button>
          <button 
            onClick={handleGuestSignIn}
            className="w-full bg-secondary text-white py-4 rounded-2xl font-black hover:bg-secondary/90 transition-all active:scale-95 shadow-xl shadow-secondary/10"
          >
            Continue as Guest
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import { GoogleGenAI, Type } from "@google/genai";

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const getEquilibriumProtocol = async (surplus: number, mealType: string): Promise<EquilibriumData> => {
  const prompt = `Analysing a calorie surplus of ${surplus}kcal or a meal tagged as "${mealType}". 
  Role: You are "The Equilibrium" Engine, a premium Ayurvedic Bio-Optimizer.
  Goal: Neutralize metabolic disruptions from overeating or late-night meals.
  
  Input Logic:
  - If surplus > 20% or mealType == "Cheat Meal", trigger protocol.
  - Identify 'Culprit': 
      - High Sugar -> Prescribe Glucose-Stabilizers (e.g., Cinnamon, Methi).
      - High Sodium/Bloat -> Prescribe Diuretic/Cooling agents (e.g., Dhaniya, Coconut Water).
      - High Fat/Oily -> Prescribe Lipid-Metabolizers (e.g., Triphala, Ginger).
  
  Please provide the response in the following JSON format:
  {
    "protocol": "The Equilibrium",
    "culprit_identified": "[Sugar/Sodium/Fat]",
    "night_notification": "Short, actionable prep instruction for tonight.",
    "morning_dashboard": "Encouraging, premium-toned instruction for the morning.",
    "scientific_insight": "A brief explanation of how the Ayurvedic ingredient counteracts the specific culprit."
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            protocol: { type: Type.STRING },
            culprit_identified: { type: Type.STRING },
            night_notification: { type: Type.STRING },
            morning_dashboard: { type: Type.STRING },
            scientific_insight: { type: Type.STRING }
          },
          required: ["protocol", "culprit_identified", "night_notification", "morning_dashboard", "scientific_insight"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Equilibrium AI error:", error);
    return {
      protocol: "The Equilibrium",
      culprit_identified: "Metabolic Surplus",
      night_notification: "Prepare a warm cup of Ginger tea with a pinch of Haldi tonight.",
      morning_dashboard: "Start your morning with lukewarm lemon water to reset your systems.",
      scientific_insight: "Ginger stimulates the digestive fire (Agni) while Haldi maintains healthy inflammatory response."
    };
  }
};

// --- View: Onboarding Wizard ---
function OnboardingWizard({ user, onComplete }: { user: UserProfile, onComplete: (data: Partial<UserProfile>) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    basics: { name: user.name, dob: '1995-01-01', gender: 'Male' },
    body: { weight: 70, weightUnit: 'kg', height: 175, heightUnit: 'cm', bmi: 0 },
    goal: { purpose: 'Stay Fit', targetWeight: 70, timeline: '3 months', activityLevel: 'Moderate' },
    lifestyle: { dietary: [], allergies: [], waterGoal: 2.5 }
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({ ...prev, [section]: { ...(prev as any)[section], ...data } }));
  };

  const bmi = calculateBMI(
    formData.body?.weight || 0, 
    formData.body?.height || 0, 
    formData.body?.weightUnit || 'kg', 
    formData.body?.heightUnit || 'cm'
  );
  const bmiCat = getBMICategory(bmi);

  const handleFinish = () => {
    const finalProfile = { ...formData, isOnboarded: true } as UserProfile;
    finalProfile.body!.bmi = bmi;
    finalProfile.dailyCalories = calculateDailyCalories(finalProfile);
    onComplete(finalProfile);
  };

  return (
    <div className="min-h-screen bg-app-bg font-app-sans flex flex-col items-center py-12 px-6">
      <div className="max-w-2xl w-full">
        <div className="mb-12">
          <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">
            <span>Step {step} of 4</span>
            <span>{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-black/5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black text-secondary mb-2 uppercase tracking-tight">The Basics</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Full Name</label>
                    <input type="text" value={formData.basics?.name} onChange={(e) => updateFormData('basics', { name: e.target.value })} className="w-full bg-app-bg border-none rounded-2xl px-6 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Date of Birth</label>
                    <input type="date" value={formData.basics?.dob} onChange={(e) => updateFormData('basics', { dob: e.target.value })} className="w-full bg-app-bg border-none rounded-2xl px-6 py-4 font-bold text-secondary focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Gender</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Male', 'Female', 'Other'].map(g => (
                        <button key={g} onClick={() => updateFormData('basics', { gender: g })} className={`py-4 rounded-2xl font-bold transition-all ${formData.basics?.gender === g ? 'bg-primary text-white shadow-lg' : 'bg-app-bg text-secondary/40 hover:bg-black/5'}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black text-secondary mb-2 uppercase tracking-tight">Body Stats</h2>
                <div className="space-y-8">
                  <div className="bg-app-bg rounded-3xl p-8 flex items-center justify-between">
                    <div>
                      <span className="text-4xl font-black text-secondary">{bmi}</span>
                      <p className="text-[10px] font-black text-app-text/40 uppercase tracking-widest mt-1">Current BMI</p>
                    </div>
                    <div className={`${bmiCat.color} text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                      {bmiCat.label}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <button onClick={() => updateFormData('body', { weightUnit: formData.body?.weightUnit === 'kg' ? 'lb' : 'kg' })} className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">{formData.body?.weightUnit}</button>
                      <input type="number" value={formData.body?.weight} onChange={(e) => updateFormData('body', { weight: Number(e.target.value) })} className="w-full bg-app-bg border-none rounded-2xl px-6 py-4 font-bold text-secondary outline-none" />
                    </div>
                    <div>
                      <button onClick={() => updateFormData('body', { heightUnit: formData.body?.heightUnit === 'cm' ? 'ft' : 'cm' })} className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">{formData.body?.heightUnit}</button>
                      <input type="number" value={formData.body?.height} onChange={(e) => updateFormData('body', { height: Number(e.target.value) })} className="w-full bg-app-bg border-none rounded-2xl px-6 py-4 font-bold text-secondary outline-none" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black text-secondary mb-2 uppercase tracking-tight">Your Goal</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {['Lose Weight', 'Build Muscle', 'Stay Fit', 'Improve Endurance', 'Gain Weight'].map(g => (
                      <button key={g} onClick={() => updateFormData('goal', { purpose: g })} className={`p-4 rounded-2xl font-bold flex items-center justify-between border-2 transition-all ${formData.goal?.purpose === g ? 'border-primary bg-primary/5 text-primary' : 'border-black/5 text-secondary/60 hover:border-black/20'}`}>
                        {g} {formData.goal?.purpose === g && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                  <select value={formData.goal?.activityLevel} onChange={(e) => updateFormData('goal', { activityLevel: e.target.value })} className="w-full bg-app-bg border-none rounded-2xl px-6 py-4 font-bold text-secondary outline-none appearance-none">
                    {['Sedentary', 'Light', 'Moderate', 'Very Active', 'Athlete'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </motion.div>
            )}
            {step === 4 && (
              <motion.div key="4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black text-secondary mb-2 uppercase tracking-tight">Lifestyle</h2>
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free'].map(d => {
                      const sel = formData.lifestyle?.dietary?.includes(d);
                      return <button key={d} onClick={() => updateFormData('lifestyle', { dietary: sel ? formData.lifestyle?.dietary?.filter(i => i !== d) : [...(formData.lifestyle?.dietary || []), d] })} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${sel ? 'bg-primary text-white shadow-md' : 'bg-black/5 text-secondary/40'}`}>{d}</button>;
                    })}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-secondary uppercase tracking-widest mb-3">Daily Water Goal (Liters)</label>
                    <div className="flex items-center gap-6">
                      <input type="range" min="1" max="5" step="0.5" value={formData.lifestyle?.waterGoal} onChange={(e) => updateFormData('lifestyle', { waterGoal: Number(e.target.value) })} className="flex-grow accent-primary" />
                      <span className="font-black text-secondary w-12 text-right">{formData.lifestyle?.waterGoal}L</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-12 flex gap-4">
            {step > 1 && <button onClick={prevStep} className="flex-grow py-5 rounded-2xl font-black text-secondary bg-app-bg hover:bg-black/5 transition-all">Back</button>}
            <button onClick={step === 4 ? handleFinish : nextStep} className="flex-[2] py-5 rounded-2xl font-black text-white bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
              {step === 4 ? 'Complete' : 'Next'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Landing Page View ---
function LandingPage({ onStart }: { onStart: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    { icon: <Dumbbell className="w-6 h-6" />, title: "AI Workout Planner", desc: "Custom routines that evolve with your progress and goals." },
    { icon: <Utensils className="w-6 h-6" />, title: "Calorie Tracker", desc: "Snap a photo of your meal and let AI handle the macros." },
    { icon: <LayoutDashboard className="w-6 h-6" />, title: "Smart Dashboard", desc: "Unified view of your health data across all platforms." },
    { icon: <Zap className="w-6 h-6" />, title: "AI Coach FitBit", desc: "Wearable integration for real-time form correction." },
    { icon: <PieChart className="w-6 h-6" />, title: "Progress Analytics", desc: "Predictive modeling to show when you'll reach your peak." },
    { icon: <Mail className="w-6 h-6" />, title: "Email Reports", desc: "Weekly summaries sent directly to your inbox." },
  ];

  const steps = [
    { title: "Connect", desc: "Sync your wearables and health data." },
    { title: "Personalize", desc: "AI builds your unique fitness profile." },
    { title: "Track", desc: "Log workouts and meals with ease." },
    { title: "Succeed", desc: "Reach your goals with dynamic guidance." },
  ];

  const pricing = [
    { name: "Free", price: "$0", perks: ["Basic Tracking", "Community Forge", "Manual Logging"] },
    { name: "Pro", price: "$12", perks: ["AI Workout Plans", "Smart Macros", "Weekly Analytics"], highlighted: true },
    { name: "Premium", price: "$29", perks: ["1-on-1 AI Coaching", "Wearable Sync", "Priority Feedback"] },
  ];

  return (
    <div className="min-h-screen bg-app-bg font-app-sans selection:bg-accent/30 selection:text-primary">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white shadow-sm border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
              <Zap fill="white" className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-primary">HealthifyYou</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-secondary hover:text-primary transition-colors">Solutions</a>
            <a href="#how-it-works" className="text-sm font-semibold text-secondary hover:text-primary transition-colors">Community</a>
            <a href="#pricing" className="text-sm font-semibold text-secondary hover:text-primary transition-colors">Pricing</a>
            <button 
              onClick={onStart}
              className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
            >
              Get Started
            </button>
          </div>

          <button className="md:hidden text-secondary" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 pt-24 bg-white z-40 md:hidden px-6 space-y-4"
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-2xl font-bold text-secondary">Solutions</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-2xl font-bold text-secondary">Community</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-2xl font-bold text-secondary">Pricing</a>
            <button 
              onClick={() => { setMobileMenuOpen(false); onStart(); }}
              className="w-full bg-primary text-white py-4 rounded-2xl text-xl font-bold shadow-xl"
            >
              Get Started
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="pt-20 bg-linear-to-br from-white to-[#eef2e6] border-b-[10px] border-accent">
        <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-black text-secondary leading-[1.1] tracking-tight mb-8">
              Your AI-Powered <br />
              <span className="text-primary">Health Companion</span>
            </h1>
            <p className="text-lg md:text-xl text-app-text/70 max-w-2xl mb-12 leading-relaxed">
              Personalized workouts, nutrition tracking, and insights driven by state-of-the-art AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={onStart}
                className="bg-primary text-white px-10 py-5 rounded-full text-lg font-bold hover:shadow-2xl hover:shadow-primary/40 transition-all active:scale-95"
              >
                Start Free Trial
              </button>
              <button className="bg-secondary text-white px-10 py-5 rounded-full text-lg font-bold hover:bg-secondary/90 transition-all active:scale-95 shadow-xl">
                Learn More
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-white border-l-4 border-accent shadow-xs hover:shadow-xl transition-all group"
            >
              <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-3">{f.title}</h3>
              <p className="text-app-text/60 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works - Timeline */}
      <section id="how-it-works" className="py-32 bg-white/50 border-y border-black/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-black text-secondary mb-4">How it Works</h2>
            <p className="text-app-text/50">Four simple steps to a better you</p>
          </div>

          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-1 bg-accent/20 hidden md:block" />
            <div className="space-y-16">
              {steps.map((s, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex flex-col md:flex-row gap-8 relative"
                >
                  <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold z-10 shrink-0 shadow-lg">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-primary mb-2">{s.title}</h3>
                    <p className="text-app-text/70 max-w-lg font-medium">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-secondary mb-4">Choose Your Path</h2>
            <p className="text-app-text/50">Flexible plans for every fitness level</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((p, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`p-10 rounded-3xl border-2 ${p.highlighted ? 'border-primary bg-white shadow-2xl relative' : 'border-black/5 bg-app-bg'} flex flex-col`}
              >
                {p.highlighted && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">MOST POPULAR</span>
                )}
                <h3 className="text-xl font-black mb-2 text-primary">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-secondary">{p.price}</span>
                  <span className="text-app-text/40 font-bold">/mo</span>
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                  {p.perks.map((perk, pi) => (
                    <li key={pi} className="flex items-center gap-3 text-sm font-bold text-app-text/70">
                      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        <Check className="w-3 h-3" strokeWidth={4} />
                      </div>
                      {perk}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={onStart}
                  className={`w-full py-4 rounded-full font-black transition-all ${p.highlighted ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02]' : 'bg-secondary text-white hover:bg-secondary/90'}`}
                >
                  Choose {p.name}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 bg-secondary text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-6 text-white">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
                  <Zap fill="white" className="w-4 h-4" />
                </div>
                <span className="font-black text-xl tracking-tight">HealthifyYou</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Empowering individuals through AI-driven physical and mental transformation.
            </p>
          </div>
          <div>
            <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-accent">Product</h4>
            <ul className="space-y-4 text-sm text-white/50">
              <li><a href="#" className="hover:text-accent font-bold">Features</a></li>
              <li><a href="#" className="hover:text-accent font-bold">Wearables</a></li>
              <li><a href="#" className="hover:text-accent font-bold">Nutrition</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-accent">Company</h4>
            <ul className="space-y-4 text-sm text-white/50">
              <li><a href="#" className="hover:text-accent font-bold">About</a></li>
              <li><a href="#" className="hover:text-accent font-bold">Blog</a></li>
              <li><a href="#" className="hover:text-accent font-bold">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-6 uppercase text-xs tracking-widest text-accent">Social</h4>
            <ul className="space-y-4 text-sm text-white/50 font-bold">
              <li><a href="#" className="hover:text-accent">Twitter</a></li>
              <li><a href="#" className="hover:text-accent">Instagram</a></li>
              <li><a href="#" className="hover:text-accent">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest text-center md:text-left">
          © 2026 HealthifyYou AI. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}

// --- App Shell View ---
function AppShell({ user, onLogout }: { user: UserProfile, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [consumedToday, setConsumedToday] = useState(0);
  const [cheatMealCount, setCheatMealCount] = useState(0);
  const [eqLoading, setEqLoading] = useState(false);
  const [eqData, setEqData] = useState<EquilibriumData | null>(null);

  const surplus = consumedToday - (user.dailyCalories || 2000);
  const isAlert = surplus > (user.dailyCalories || 2000) * 0.2 || cheatMealCount > 0;

  useEffect(() => {
    if (isAlert && !eqData && !eqLoading) {
      handleTriggerEquilibrium();
    }
  }, [isAlert]);

  const handleTriggerEquilibrium = async () => {
    setEqLoading(true);
    const result = await getEquilibriumProtocol(surplus, cheatMealCount > 0 ? "Cheat Meal" : "Regular Surplus");
    setEqData(result);
    setEqLoading(false);
  };

  const tabs = [
    { id: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "Workouts", icon: <Dumbbell className="w-5 h-5" /> },
    { id: "Meals", icon: <Utensils className="w-5 h-5" /> },
    { id: "Coach", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "Profile", icon: <User className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-secondary mb-8 uppercase tracking-tight">Today's Focus, {user.basics?.name.split(' ')[0]}</h2>
            
            {isAlert && eqData && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-linear-to-r from-[#1a1a1a] to-[#252525] border-l-4 border-[#D4AF37] p-8 rounded-3xl mb-8 shadow-2xl overflow-hidden relative"
              >
                <div className="absolute -top-4 -right-4 text-[#D4AF37]/5 font-black text-8xl uppercase leading-none select-none pointer-events-none">EQUILIBRIUM</div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[#D4AF37] text-2xl font-black">◈</span>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-xl tracking-wide uppercase leading-none">The Equilibrium</span>
                    <span className="text-[#D4AF37] text-[10px] font-bold tracking-[0.2em] uppercase">Active Protocol</span>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 relative z-10">
                  <div className="space-y-4">
                    <h4 className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">Morning Ritual</h4>
                    <p className="text-white font-bold leading-relaxed">{eqData.morning_dashboard}</p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">Scientific Insight</h4>
                    <p className="text-white/60 text-sm italic">{eqData.scientific_insight}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-secondary/5 border border-black/5">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4"><Activity className="w-6 h-6" /></div>
                <h4 className="text-[10px] font-black text-app-text/40 uppercase tracking-widest mb-1">Consumed</h4>
                <p className={`text-3xl font-black ${consumedToday > (user.dailyCalories || 2000) ? 'text-red-500' : 'text-secondary'}`}>{consumedToday}</p>
                <p className="text-[10px] font-bold text-app-text/40 mt-2">Target: {user.dailyCalories}</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-secondary/5 border border-black/5">
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-4"><Droplets className="w-6 h-6" /></div>
                <h4 className="text-[10px] font-black text-app-text/40 uppercase tracking-widest mb-1">Water</h4>
                <p className="text-3xl font-black text-secondary">{user.lifestyle?.waterGoal}L</p>
                <p className="text-[10px] font-bold text-accent mt-2">Target</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-secondary/5 border border-black/5">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4"><Scale className="w-6 h-6" /></div>
                <h4 className="text-[10px] font-black text-app-text/40 uppercase tracking-widest mb-1">BMI</h4>
                <p className="text-3xl font-black text-secondary">{user.body?.bmi}</p>
                <p className="text-[10px] font-bold text-blue-500 mt-2">{getBMICategory(user.body?.bmi || 0).label}</p>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8"><Zap className="w-24 h-24 text-accent/5" /></div>
               <h3 className="text-xl font-black text-secondary mb-4 uppercase tracking-tight">AI Insights</h3>
               <p className="text-app-text/70 font-medium leading-relaxed max-w-lg mb-6">
                 {isAlert 
                   ? `Deep analysis detected a metabolic surplus. "The Equilibrium" protocol has been activated to protect your progress.` 
                   : `Stay consistent and ensure you hit that ${user.lifestyle?.waterGoal}L water mark today. You're performing better than 84% of your peers.`}
               </p>
               {isAlert && (
                 <button 
                   onClick={() => setActiveTab("Equilibrium")}
                   className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                 >
                   View Protocol
                 </button>
               )}
            </div>
          </div>
        );
      case "Equilibrium":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="text-center mb-12">
               <div className="w-20 h-20 bg-linear-to-br from-[#1a1a1a] to-[#2c2c2c] rounded-3xl mx-auto flex items-center justify-center shadow-2xl border border-[#D4AF37] mb-6">
                 <span className="text-[#D4AF37] text-4xl">◈</span>
               </div>
               <h2 className="text-4xl font-black text-secondary mb-2 uppercase tracking-tight">The Equilibrium</h2>
               <p className="text-[#D4AF37] font-black text-[10px] tracking-[0.4em] uppercase">Premium Bio-Optimizer</p>
            </div>

            {eqLoading ? (
              <div className="flex flex-col items-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
                <p className="font-black text-[10px] text-app-text/40 uppercase tracking-widest">Consulting metabolic vault...</p>
              </div>
            ) : eqData ? (
              <div className="space-y-6">
                 <div className="bg-linear-to-br from-[#1a1a1a] to-[#252525] p-10 rounded-[2.5rem] border-b-[8px] border-[#D4AF37] shadow-3xl text-white">
                   <div className="flex justify-between items-start mb-8">
                      <div>
                        <h4 className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-1 text-left">Metabolic Culprit</h4>
                        <p className="text-2xl font-black uppercase tracking-tight">{eqData.culprit_identified}</p>
                      </div>
                      <div className="bg-[#D4AF37] text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Protocol Active</div>
                   </div>

                   <div className="space-y-8">
                      <div>
                        <h4 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Clock className="w-3 h-3 text-[#D4AF37]" /> Tonight's Preparation
                        </h4>
                        <p className="text-lg font-bold leading-relaxed">{eqData.night_notification}</p>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div>
                        <h4 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Zap className="w-3 h-3 text-[#D4AF37]" /> Morning Reset
                        </h4>
                        <p className="text-lg font-bold leading-relaxed">{eqData.morning_dashboard}</p>
                      </div>
                   </div>
                 </div>

                 <div className="bg-white p-8 rounded-[2rem] border border-black/5 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 text-accent/5 group-hover:scale-110 transition-transform duration-700">
                      <Zap className="w-16 h-16" fill="currentColor" />
                    </div>
                    <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-4">Scientific Basis</h4>
                    <p className="text-app-text/60 text-sm leading-relaxed font-medium">{eqData.scientific_insight}</p>
                 </div>
              </div>
            ) : (
              <div className="bg-app-bg p-12 rounded-[2.5rem] border-2 border-dashed border-black/5 text-center">
                 <p className="text-app-text/30 font-black uppercase tracking-widest leading-loose">
                   Your metabolism is currently centered.<br /> 
                   The Vault will activate automatically upon detection of surplus stressors.
                 </p>
              </div>
            )}
          </div>
        );
      case "Meals":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-secondary mb-8 uppercase tracking-tight">Nutrition Tracker</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-black/5">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6">Log Quick Meal</h3>
                <div className="space-y-4">
                   <button 
                     onClick={() => setConsumedToday(prev => prev + 500)}
                     className="w-full py-4 bg-app-bg rounded-2xl font-black text-secondary text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                   >
                     Standard Meal (+500 kcal)
                   </button>
                   <button 
                     onClick={() => {
                       setConsumedToday(prev => prev + 1200);
                       setCheatMealCount(prev => prev + 1);
                     }}
                     className="w-full py-4 bg-[#1a1a1a] rounded-2xl font-black text-white text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                   >
                     Cheat Meal (+1200 kcal) <Zap className="w-3 h-3 text-[#D4AF37]" />
                   </button>
                   <button 
                     onClick={() => { setConsumedToday(0); setCheatMealCount(0); setEqData(null); }}
                     className="w-full py-4 border-2 border-black/5 rounded-2xl font-black text-app-text/30 text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all font-bold"
                   >
                     Reset Daily Logs
                   </button>
                </div>
              </div>
              <div className="bg-[#fafafa] border-2 border-dashed border-black/5 rounded-[2.5rem] p-12 text-center text-app-text/30 font-black uppercase tracking-widest flex items-center justify-center">
                Visual Macro Breakdown <br /> Coming Soon
              </div>
            </div>
          </div>
        );
      case "Workouts":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-secondary mb-8 uppercase tracking-tight">Workouts</h2>
            <div className="bg-[#fafafa] border-2 border-dashed border-black/5 rounded-3xl p-12 text-center text-app-text/30 font-black uppercase tracking-widest">Plan: {user.goal?.purpose}</div>
          </div>
        );
      case "Coach":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            <h2 className="text-2xl font-black text-secondary mb-8 uppercase tracking-tight">AI Coach</h2>
            <div className="flex-grow bg-[#fafafa] border-2 border-dashed border-black/5 rounded-[2.5rem] flex flex-col items-center justify-center text-app-text/30 p-8">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="font-black uppercase tracking-widest">AI interface for {user.basics?.name}</p>
            </div>
          </div>
        );
      case "Profile":
        const cat = getBMICategory(user.body?.bmi || 0);
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-secondary mb-8 uppercase tracking-tight">Profile</h2>
            <div className="bg-white p-8 rounded-[2rem] border border-black/5 shadow-xl shadow-secondary/5 flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-black">{user.basics?.name.charAt(0)}</div>
                <div className="flex-grow">
                  <h3 className="text-xl font-black text-secondary">{user.basics?.name}</h3>
                  <p className="text-app-text/50 font-bold text-sm tracking-widest uppercase">{user.isGuest ? 'Guest' : 'Member'}</p>
                </div>
                <div className={`${cat.color} text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest`}>BMI: {user.body?.bmi}</div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col md:flex-row font-app-sans overflow-x-hidden">
      <aside className={`hidden md:flex flex-col bg-secondary transition-all relative z-40 ${collapsed ? 'w-24' : 'w-72'}`}>
        <div className="p-8 h-24 flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-lg"><Zap fill="white" className="w-6 h-6" /></div>
          {!collapsed && <span className="font-black text-xl text-white uppercase tracking-tight shrink-0">HY.APP</span>}
        </div>
        
        <nav className="flex-grow px-4 space-y-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 py-4 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/40 text-left' : 'text-white/60 hover:text-white hover:bg-white/5 text-left'} ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
              <div className="shrink-0">{tab.icon}</div>
              {!collapsed && <span className="font-black uppercase tracking-widest text-xs">{tab.id}</span>}
            </button>
          ))}

          {/* Premium Equilibrium Sidebar Item */}
          {!collapsed && (
            <button 
              onClick={() => setActiveTab("Equilibrium")}
              className={`w-full flex items-center p-4 my-4 transition-all cursor-pointer border-l-4 rounded-r-xl group ${
                activeTab === "Equilibrium" 
                ? 'bg-linear-to-r from-[#1a1a1a] to-[#252525] border-[#D4AF37] shadow-[0px_4px_15px_rgba(212,175,55,0.2)] scale-[1.02]' 
                : 'bg-linear-to-r from-[#111111] to-[#1a1a1a] border-transparent hover:border-[#D4AF37]/50'
              }`}
            >
                <div className="flex items-center gap-3">
                    <span className={`text-[#D4AF37] text-xl transition-transform duration-500 ${isAlert && activeTab !== "Equilibrium" ? 'animate-pulse scale-110' : ''}`}>◈</span>
                    <div className="flex flex-col items-start translate-y-0.5">
                        <span className="text-white font-black text-[10px] tracking-widest uppercase">The Equilibrium</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[#D4AF37] text-[7px] font-black tracking-tighter uppercase whitespace-nowrap">PREMIUM BIOTA</span>
                          {isAlert && <div className="w-1 h-1 bg-red-500 rounded-full animate-ping" />}
                        </div>
                    </div>
                </div>
            </button>
          )}
        </nav>

        <div className="p-8 space-y-4">
           {!collapsed && <button onClick={onLogout} className="w-full bg-white/10 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-white/20 transition-all">Log Out</button>}
           <button onClick={() => setCollapsed(!collapsed)} className="w-full h-12 rounded-xl bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-colors">{collapsed ? <ChevronRight /> : <ChevronLeft />}</button>
        </div>
      </aside>

      <main className="flex-grow min-h-screen overflow-y-auto pb-32 md:pb-8 pt-12 px-6 md:px-16 bg-[#fdfdfd]">
        <div className="max-w-4xl mx-auto">{renderContent()}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-secondary text-white px-2 pt-3 pb-8 z-50 flex justify-around items-center shadow-2xl overflow-x-auto whitespace-nowrap scrollbar-hide">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-2 transition-all min-w-[60px] ${activeTab === tab.id ? 'text-accent font-black' : 'text-white/40 font-bold'}`}>
            <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-primary shadow-lg scale-110' : ''}`}>{tab.icon}</div>
            <span className="text-[8px] uppercase tracking-widest">{tab.id}</span>
          </button>
        ))}
        <button onClick={() => setActiveTab("Equilibrium")} className={`flex flex-col items-center gap-2 transition-all min-w-[70px] ${activeTab === "Equilibrium" ? 'scale-110' : ''}`}>
           <div className={`p-2 rounded-xl bg-[#1a1a1a] border border-[#D4AF37] ${activeTab === "Equilibrium" ? 'shadow-lg shadow-[#D4AF37]/20' : ''}`}>
             <span className="text-[#D4AF37] text-xs">◈</span>
           </div>
           <span className={`text-[7px] uppercase tracking-widest ${activeTab === "Equilibrium" ? 'text-[#D4AF37] font-black' : 'text-white/40 font-bold'}`}>EQ.</span>
        </button>
      </nav>
    </div>
  );
}

// --- Main App Entry ---
export default function App() {
  const [view, setView] = useState<"landing" | "login" | "onboarding" | "app">("landing");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserProfile(parsed);
      setView(parsed.isOnboarded ? "app" : "onboarding");
    }
  }, []);

  const handleLogin = (user: Partial<UserProfile>) => {
    const fresh = { ...user, isOnboarded: false } as UserProfile;
    setUserProfile(fresh);
    localStorage.setItem("userProfile", JSON.stringify(fresh));
    setView("onboarding");
  };

  const handleComplete = (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...data, isOnboarded: true } as UserProfile;
    setUserProfile(updated);
    localStorage.setItem("userProfile", JSON.stringify(updated));
    setView("app");
  };

  const handleLogout = () => {
    localStorage.removeItem("userProfile");
    setUserProfile(null);
    setView("landing");
  };

  return (
    <AnimatePresence mode="wait">
      {view === "landing" && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
          <LandingPage onStart={() => setView("login")} />
        </motion.div>
      )}
      {view === "login" && (
        <motion.div key="login" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <LoginScreen onLogin={handleLogin} />
        </motion.div>
      )}
      {view === "onboarding" && (
        <motion.div key="onboarding" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <OnboardingWizard user={userProfile!} onComplete={handleComplete} />
        </motion.div>
      )}
      {view === "app" && (
        <motion.div key="app" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
          <AppShell user={userProfile!} onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
