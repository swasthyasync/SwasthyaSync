import React from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <select
      value={i18n.language}
      onChange={handleLanguageChange}
      className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${className}`}
      aria-label="Select Language"
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
      <option value="ta">தமிழ்</option>
      <option value="te">తెలుగు</option>
      <option value="kn">ಕನ್ನಡ</option>
      <option value="ml">മലയാളം</option>
      <option value="gu">ગુજરાતી</option>
      <option value="mr">मराठी</option>
    </select>
  );
};

export default LanguageSelector;