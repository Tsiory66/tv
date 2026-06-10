import React, { useState } from "react";
import { Check, Shield, AlertCircle, Smartphone, HelpCircle, Loader } from "lucide-react";

interface PaymentSimulatorProps {
  paymentId: string;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
  userPhone?: string;
  userName?: string;
}

export default function PaymentSimulator({
  paymentId,
  onPaymentSuccess,
  onPaymentCancel,
  userPhone = "",
  userName = ""
}: PaymentSimulatorProps) {
  const [operator, setOperator] = useState<"mvola" | "orange" | "airtel">("mvola");
  const [phone, setPhone] = useState(userPhone || "034");
  const [step, setStep] = useState<"input" | "loading" | "success" | "error">("input");
  const [ussdCode, setUssdCode] = useState("");
  const [errorText, setErrorText] = useState("");

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      setErrorText("Veuillez saisir un numéro de téléphone malgache valide.");
      return;
    }
    setErrorText("");
    setStep("loading");

    // Simulate validation flow (like USSD popups)
    try {
      // Step A: Request webhook trigger to server to flag the payment and the user as premium!
      const response = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId: paymentId,
          status: "success",
          operator,
          phoneNumber: phone,
        }),
      });

      if (!response.ok) {
        throw new Error("Le serveur de paiement simulation a renvoyé une erreur.");
      }

      await response.json();

      // Artificial wait time for incredible realism!
      setTimeout(() => {
        setStep("success");
      }, 3500);

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Erreur de connexion avec l'opérateur mobile.");
      setStep("error");
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#0C0C0E] border border-white/5 rounded-3xl shadow-2xl overflow-hidden font-sans animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-950/80 to-[#0C0C0E] border-b border-white/5 px-8 py-6 text-white text-center relative">
        <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-widest font-black text-emerald-400">
          Papi.mg Sandbox
        </div>
        <h2 className="text-xl font-bold tracking-tight">Passerelle de Paiement Sécurisée</h2>
        <p className="text-slate-400 text-xs mt-1">
          Opérateurs Mobiles de Madagascar • MVola, Orange, Airtel
        </p>
      </div>

      <div className="p-8">
        {step === "input" && (
          <form onSubmit={handleStartPayment} className="space-y-6">
            {/* Amount details */}
            <div className="bg-[#09090B] rounded-xl p-4 flex justify-between items-center border border-white/5">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ACCÈS PREMIUM À VIE</span>
                <span className="text-xs text-slate-300 mt-1 block">Facture FootStream MVP</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-400 block tracking-tight">10 000 Ar</span>
                <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Paiement Unique</span>
              </div>
            </div>

            {/* Operator Selectors */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Sélectionnez votre opérateur
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Mvola */}
                <button
                  type="button"
                  onClick={() => setOperator("mvola")}
                  className={`flex flex-col items-center p-3.5 rounded-xl border-2 transition text-center cursor-pointer ${
                    operator === "mvola"
                      ? "border-amber-500 bg-amber-500/5 text-amber-300"
                      : "border-white/5 bg-[#09090B] hover:border-white/20 text-slate-500"
                  }`}
                >
                  <span className="text-base font-black text-amber-500">Mvola</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">Telma</span>
                </button>

                {/* Orange Money */}
                <button
                  type="button"
                  onClick={() => setOperator("orange")}
                  className={`flex flex-col items-center p-3.5 rounded-xl border-2 transition text-center cursor-pointer ${
                    operator === "orange"
                      ? "border-orange-500 bg-orange-500/5 text-orange-450"
                      : "border-white/5 bg-[#09090B] hover:border-white/20 text-slate-500"
                  }`}
                >
                  <span className="text-base font-black text-orange-500">Orange</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">OM</span>
                </button>

                {/* Airtel Money */}
                <button
                  type="button"
                  onClick={() => setOperator("airtel")}
                  className={`flex flex-col items-center p-3.5 rounded-xl border-2 transition text-center cursor-pointer ${
                    operator === "airtel"
                      ? "border-rose-500 bg-rose-500/5 text-rose-400"
                      : "border-white/5 bg-[#09090B] hover:border-white/20 text-slate-500"
                  }`}
                >
                  <span className="text-base font-black text-rose-500">Airtel</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">AM</span>
                </button>
              </div>
            </div>

            {/* Input Phone */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Numéro de téléphone mobile
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Smartphone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="034 00 000 00"
                  className="w-full bg-[#09090B] border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Utilisé uniquement pour initier la validation sur votre mobile (ex : composez le #111*1*2# etc.)
              </p>
            </div>

            {errorText && (
              <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            {/* Confirm Actions */}
            <div className="space-y-2">
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-widest text-xs py-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow"
              >
                Confirmer et Payer 10 000 Ar
              </button>

              <button
                type="button"
                onClick={onPaymentCancel}
                className="w-full bg-transparent hover:bg-white/5 text-slate-400 hover:text-white py-2.5 rounded-xl transition text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Annuler et retourner au programme
              </button>
            </div>

            {/* Footer trust badge */}
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[9px] font-bold uppercase tracking-wider mt-2">
              <Shield className="w-3.5 h-3.5" />
              Agrément Papi.mg • Cryptage 256 bits
            </div>
          </form>
        )}

        {step === "loading" && (
          <div className="text-center py-12 px-4 space-y-6">
            <Loader className="w-12 h-12 text-emerald-400 mx-auto animate-spin" />
            <div className="space-y-2">
              <h4 className="text-white font-bold text-base">Traitement de l'opération...</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Veuillez valider la demande de débit reçue par SMS/USSD sur votre mobile lié à votre compte{" "}
                <span className="font-bold text-amber-400 capitalize">{operator}</span> ({phone}).
              </p>
            </div>
            
            <div className="bg-[#09090B] p-4 rounded-xl inline-block text-xs font-mono text-slate-500 border border-white/5">
              ID de session : {paymentId}
            </div>

            <p className="text-[10px] text-emerald-400/80 leading-relaxed max-w-md mx-auto">
              Dans cette démo MVP, après 3 secondes, l'API simule de façon sécurisée que vous avez saisie votre code secret sur votre téléphone.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-12 px-4 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Abonnement Activé !</h3>
              <p className="text-slate-300 text-sm max-w-xs mx-auto">
                Misaotra dila! Votre paiement de 10 000 Ar a été reçu avec succès par Papi.mg.
              </p>
            </div>

            <div className="bg-emerald-500/5 text-emerald-400/90 text-xs px-5 py-3 rounded-xl border border-emerald-500/10 max-w-md mx-auto inline-block">
              <span className="font-bold">isPremium = true</span> (Accès à vie activé)
            </div>

            <button
              onClick={onPaymentSuccess}
              className="w-full bg-[#09090B] hover:bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition cursor-pointer"
            >
              Retourner au Dashboard
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-12 px-4 space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Échec du paiement</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                {errorText || "La transaction a été refusée par l'opérateur."}
              </p>
            </div>

            <button
              onClick={() => setStep("input")}
              className="w-full bg-slate-850 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition"
            >
              Réessayer le paiement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
