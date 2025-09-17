import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Phone, Leaf, Flame, Droplet, Calendar, Users, Shield } from "lucide-react";

const Intro: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang).catch(() => {});
    try {
      localStorage.setItem("swasthya_lang", lang);
    } catch {}
  };

  const handleQuickRegister = () => {
    if (phoneNumber.trim()) {
      navigate(`/auth/phone?phone=${encodeURIComponent(phoneNumber.trim())}`);
    } else {
      navigate("/auth/phone");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white text-gray-800">
      {/* Header */}
      <header className="w-full px-6 py-4 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">SS</div>
            <div>
              <div className="text-xl font-bold">{t("common.appName")}</div>
              <div className="text-sm text-slate-500">{t("hero.subtitle")}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label htmlFor="lang" className="sr-only">{t("common.appName")}</label>
            <select
              id="lang"
              value={i18n.language || "en"}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-2 border rounded bg-white text-sm"
              aria-label={t("common.appName")}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
            </select>

            <button
              onClick={() => navigate("/auth/login")}
              className="px-3 py-2 border rounded bg-white text-sm hover:bg-gray-50"
            >
              {t("practitioner.title", "Staff Login")}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="px-6 py-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-start">
          <section>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              {t("hero.title")}
            </h1>

            <p className="text-lg text-slate-700 mb-4">
              {t("hero.description")}
            </p>

            <p className="text-sm text-slate-600 mb-6">
              {t("hero.subtitle")}
            </p>

            {/* Quick Register Box */}
            <div className="bg-white rounded-xl shadow p-5 max-w-md">
              <h3 className="text-lg font-semibold mb-3">{t("cta.register")}</h3>
              <p className="text-sm text-slate-600 mb-3">
                {t("phoneEntry.subtitle")}
              </p>

              <div className="flex gap-3 mb-3">
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder={t("phoneEntry.phonePlaceholder") as string}
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  aria-label={t("phoneEntry.phonePlaceholder") as string}
                />
                <button
                  onClick={handleQuickRegister}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {t("cta.getOTP")}
                </button>
              </div>

              <div className="text-xs text-slate-500">
                {t("cta.callUs")}: <span className="font-medium">1800-XXX-XXXX</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/auth/phone")}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                {t("cta.register")}
              </button>
              <button
                onClick={() => window.scrollTo({ top: 600, behavior: "smooth" })}
                className="px-6 py-3 bg-white border border-green-600 text-green-600 rounded-lg hover:bg-green-50 font-medium"
              >
                {t("cta.learnMore")}
              </button>
            </div>

            {/* Short features summary */}
            <div className="mt-8 bg-white p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">{t("common.appName")}</h4>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>{t("features.voice")}</li>
                <li>{t("features.prakriti")}</li>
                <li>{t("features.scheduling")}</li>
                <li>{t("privacy")}</li>
              </ul>
            </div>
          </section>

          {/* Right column - Features & Prakriti */}
          <aside className="space-y-6">
            <div className="bg-white p-5 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-3">{t("common.appName")} — {t("features.scheduling")}</h3>

              <div className="space-y-4">
                <FeatureCard
                  Icon={Phone}
                  title={t("features.voice")}
                  desc={t("phoneEntry.alternativeText") + " " + t("cta.callUs")}
                />
                <FeatureCard
                  Icon={Users}
                  title={t("features.prakriti")}
                  desc={t("prakriti.title")}
                />
                <FeatureCard
                  Icon={Calendar}
                  title={t("features.scheduling")}
                  desc={t("features.scheduling")}
                />
                <FeatureCard
                  Icon={Shield}
                  title={t("privacy")}
                  desc={t("privacy")}
                />
              </div>
            </div>

            {/* Prakriti Cards */}
            <div className="bg-white p-5 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-3">{t("prakriti.title")}</h3>
              <p className="text-sm text-slate-600 mb-3">
                {t("phoneEntry.subtitle")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PrakritiCard
                  Icon={Leaf}
                  name={t("prakriti.vata.name")}
                  desc={t("prakriti.vata.description")}
                />
                <PrakritiCard
                  Icon={Flame}
                  name={t("prakriti.pitta.name")}
                  desc={t("prakriti.pitta.description")}
                />
                <PrakritiCard
                  Icon={Droplet}
                  name={t("prakriti.kapha.name")}
                  desc={t("prakriti.kapha.description")}
                />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Privacy & Consent</h4>
              <p className="text-sm text-slate-700">
                {t("privacy")}
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-200 py-8 mt-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="text-sm">
              © {new Date().getFullYear()} {t("common.appName")} — {t("hero.subtitle")}
            </div>

            <div className="flex gap-4">
              <button onClick={() => navigate("/practitioner/login")} className="text-sm hover:text-white">
                {t("practitioner.title")}
              </button>
              <button onClick={() => navigate("/admin/login")} className="text-sm hover:text-white">
                {t("admin.title")}
              </button>
              <button onClick={() => alert("Request demo: please contact your team lead")} className="text-sm hover:text-white">
                {t("cta.callUs")}
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {t("privacy")}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Intro;

/* ------------------ Small subcomponents ------------------ */

function FeatureCard({ Icon, title, desc }: { Icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="p-2 rounded-md bg-green-100 text-green-600">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function PrakritiCard({ Icon, name, desc }: { Icon: any; name: string; desc: string }) {
  return (
    <div className="bg-white p-3 rounded shadow-sm text-center">
      <div className="flex items-center justify-center mb-2">
        <Icon className="w-7 h-7 text-green-600" />
      </div>
      <div className="font-semibold mb-1">{name}</div>
      <div className="text-sm text-slate-600">{desc}</div>
    </div>
  );
}
