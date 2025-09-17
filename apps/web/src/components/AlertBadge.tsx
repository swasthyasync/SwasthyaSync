// apps/web/src/components/AlertBadge.tsx
import React from 'react';

interface Props {
  level: 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const AlertBadge: React.FC<Props> = ({ level, size = 'md', animated = true }) => {
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  const getColorClass = () => {
    switch (level) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="relative inline-flex">
      {animated && level !== 'green' && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${getColorClass()} opacity-75 animate-ping`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full ${getSizeClass()} ${getColorClass()}`}
      />
    </div>
  );
};

export default AlertBadge;