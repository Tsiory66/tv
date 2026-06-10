import React, { useState } from "react";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";

interface LoginFormProps {
  onLoginSuccess: (token: string, user: any) => void;
  onNavigateToRegister: () => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
}

export default function LoginForm({
  onLoginSuccess,
  onNavigateToRegister,
  isLoading,
  error: pError,
  onSubmit
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError("Veuillez remplir tous les champs");
      return;
    }
    onSubmit(email, password);
  };

  const activeError = pError || localError;

  return (
    <div className="w-full max-w-md mx-auto bg-[#0C0C0E] border border-white/5 rounded-2xl shadow-xl overflow-hidden p-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
          <LogIn className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">De retour sur FootStream Mada ?</h2>
        <p className="text-slate-400 text-xs mt-2">Connectez-vous pour ne rien rater des matchs en live</p>
      </div>

      {activeError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{activeError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
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
              placeholder="votre@email.com"
              className="w-full bg-[#09090B] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition duration-150"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
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
              placeholder="••••••••••••"
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
              <LogIn className="w-4 h-4" />
              Se Connecter
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 text-center">
        <p className="text-slate-400 text-xs">
          Nouveau sur FootStream ?{" "}
          <button
            onClick={onNavigateToRegister}
            className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer transition"
          >
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  );
}
