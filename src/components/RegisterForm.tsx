import React, { useState } from "react";
import { Mail, Lock, User, Phone, UserPlus, AlertCircle } from "lucide-react";

interface RegisterFormProps {
  onRegisterSuccess: (token: string, user: any) => void;
  onNavigateToLogin: () => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (data: { email: string; password: string; name: string; phone: string }) => void;
}

export default function RegisterForm({
  onRegisterSuccess,
  onNavigateToLogin,
  isLoading,
  error: pError,
  onSubmit
}: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!email || !password || !name || !phone) {
      setLocalError("Tous les champs sont obligatoires");
      return;
    }

    if (password.length < 6) {
      setLocalError("Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    onSubmit({ email, password, name, phone });
  };

  const activeError = pError || localError;

  return (
    <div className="w-full max-w-md mx-auto bg-[#0C0C0E] border border-white/5 rounded-2xl shadow-xl overflow-hidden p-8 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
          <UserPlus className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Rejoignez l'Aventure !</h2>
        <p className="text-slate-400 text-xs mt-1">Créez votre compte en quelques secondes</p>
      </div>

      {activeError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{activeError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Nom et Prénom
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Rakoto Jean"
              className="w-full bg-[#09090B] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition duration-150"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Adresse Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rakoto@gmail.com"
              className="w-full bg-[#09090B] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition duration-150"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Numéro Téléphone (Mvola, Orange, Airtel)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Phone className="w-4 h-4" />
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: +261 34 11 222 33"
              className="w-full bg-[#09090B] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition duration-150"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Mot de passe
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="w-full bg-[#09090B] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition duration-150"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-xs py-3.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              S'inscrire et démarrer
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-white/5 text-center">
        <p className="text-slate-400 text-xs">
          Déjà un compte ?{" "}
          <button
            onClick={onNavigateToLogin}
            className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}
