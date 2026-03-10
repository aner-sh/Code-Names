import React from 'react';
import { CardData } from '../types/index';
import { CARD_COLORS_HE } from '../types/constants';

interface CardProps {
  card: CardData;
  isSpymasterView: boolean;
  onClick: () => void;
  disabled: boolean;
}

const Card: React.FC<CardProps> = ({ card, isSpymasterView, onClick, disabled }) => {
  const getCardClasses = () => {
    if (card.isRevealed) {
      return `${CARD_COLORS_HE[card.type].revealed} ${CARD_COLORS_HE[card.type].text} border-2 border-black/10`;
    }
    if (isSpymasterView) {
      return `${CARD_COLORS_HE[card.type].spymaster} text-gray-700 border-2 md:border-4 border-dashed`;
    }
    // Updated background color to #fdf6e3 as requested
    return 'bg-[#fdf6e3] hover:bg-[#fff9c4] text-gray-800 border-2 border-[#8b5e34]/30 shadow-sm';
  };
  
  // Drastically shrunk text sizes to prevent grid blow-out
  const textTransformClass = card.word.length > 8 
    ? 'text-[10px] sm:text-xs md:text-sm' 
    : 'text-xs sm:text-sm md:text-base';

  return (
    <button
      onClick={onClick}
      disabled={disabled || card.isRevealed}
      className={`font-placeholder w-full h-full rounded-md md:rounded-lg flex items-center justify-center p-1 sm:p-2 text-center uppercase font-black transition-all duration-200 transform ${
        card.isRevealed ? '' : 'hover:-translate-y-1 active:translate-y-0 shadow-sm hover:shadow-md'
      } ${getCardClasses()} ${textTransformClass}`}
    >
      <div className="leading-none drop-shadow-sm font-placeholder break-words w-full px-1">
        {card.word}
      </div>
    </button>
  );
};

export default Card;