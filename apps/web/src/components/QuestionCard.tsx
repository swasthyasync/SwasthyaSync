import React from 'react';
import { motion } from 'framer-motion';

export const QuestionCard: React.FC<{
  question: any;
  selectedOption: string;
  onAnswer: (optionId: string) => void;
  isSubmitting: boolean;
}> = ({ question, selectedOption, onAnswer, isSubmitting }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white shadow-sm rounded-lg p-6 mb-4"
    >
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {question.text}
      </h3>
      <div className="space-y-2">
        {question.options.map((option: any) => (
          <button
            key={option.id}
            onClick={() => onAnswer(option.id)}
            disabled={isSubmitting}
            className={`w-full text-left p-3 rounded-md transition-all duration-200 ${
              selectedOption === option.id
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            } border ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {option.text}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuestionCard;